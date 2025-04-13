import "dotenv/config";
import { Client, GatewayIntentBits, Message } from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from "@discordjs/voice";
import ytdl from "@distube/ytdl-core";
import ytSearch from "yt-search";
import SpotifyWebApi from "spotify-web-api-node";
import { GuildQueue } from "./types";
import { SearchVideo } from "./interfaces";

const queues = new Map<string, GuildQueue>();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Configuración de Spotify API
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Obtener token de acceso de Spotify
spotifyApi.clientCredentialsGrant().then(
  (data) => spotifyApi.setAccessToken(data.body["access_token"]),
  (err) => console.error("Error al obtener el token de Spotify", err)
);

const searchVideo = async (query: string): Promise<SearchVideo | null> => {
  const result = await ytSearch(query);
  const video = result.videos[0] || null;
  return video ? { title: video.title, url: video.url } : null;
};

const getSpotifyPlaylistTracks = async (playlistUrl: string) => {
  const playlistId = playlistUrl.split("playlist/")[1]?.split("?")[0];
  if (!playlistId) return null;

  try {
    const data = await spotifyApi.getPlaylistTracks(playlistId);
    return data.body.items.map((item) => ({
      title: item.track?.name,
      url: item.track?.external_urls.spotify,
    }));
  } catch (error) {
    console.error(
      "Error al obtener la lista de reproducción de Spotify",
      error
    );
    return null;
  }
};

const messageQueue = (queue: GuildQueue, title: string): string =>
  queue.songs?.length === 1
    ? `🎶 Reproduciendo: ${title}`
    : `🎶 Añadido a la cola: ${title}`;

const queueHandler = async (guildId: string, message: Message) => {
  const queue = queues.get(guildId);
  if (!queue || queue.songs.length === 0) return;

  const { url, title } = queue.songs[0];
  const stream = ytdl(url, { filter: "audioonly" });
  const resource = createAudioResource(stream);
  queue.player.play(resource);

  message.reply(`🎶 Reproduciendo: ${title}`);

  queue.player.once(AudioPlayerStatus.Playing, () =>
    console.log(`▶️ Reproduciendo: ${title}`)
  );

  queue.player.once(AudioPlayerStatus.Idle, () => {
    queue.songs.shift();
    queueHandler(guildId, message);
  });
};

const nextSong = (guildId: string, message: Message) => {
  const queue = queues.get(guildId);
  if (!queue || queue.songs.length === 0) return;

  queue.songs.shift();
  queueHandler(guildId, message);
};

const stopPlayback = (guildId: string) => {
  const queue = queues.get(guildId);
  if (!queue) return;

  queue.songs = [];
  queue.player.stop();
  queue.connection.destroy();
  queues.delete(guildId);
};

const resumePlayback = (guildId: string) => {
  const queue = queues.get(guildId);
  if (!queue || queue.player.state.status !== AudioPlayerStatus.Paused) return;

  queue.player.unpause();
};

const pausePlayback = (guildId: string) => {
  const queue = queues.get(guildId);
  if (!queue || queue.player.state.status !== AudioPlayerStatus.Playing) return;

  queue.player.pause();
};

const currentPlayback = (guildId: string, message: Message): void => {
  const currentSong = getCurrentSong(guildId);
  if (currentSong) {
    message.reply(`🎶 Actualmente reproduciendo: ${currentSong}`);
  } else {
    message.reply("No hay ninguna canción reproduciéndose en este momento.");
  }
};

const getCurrentSong = (guildId: string): string | null => {
  const queue = queues.get(guildId);
  if (!queue || queue.songs.length === 0) return null;

  return queue.songs[0].title;
};

client.once("ready", () =>
  console.log(`✅ Bot conectado como ${client.user?.tag}`)
);

const playMusic = async (message: Message, args: string[]) => {
  if (!args.length) {
    message.reply("Debes escribir una canción o URL.");
    return;
  }

  const query = args.join(" ");

  if (query.includes("spotify.com/playlist")) {
    const tracks = await getSpotifyPlaylistTracks(query);
    if (!tracks || tracks.length === 0) {
      message.reply("No encontré canciones en esa lista de reproducción.");
      return;
    }

    const voiceChannel = message.member?.voice.channel;
    if (!voiceChannel) {
      message.reply("🎙️ Debes estar en un canal de voz.");
      return;
    }

    const guildId = message.guild!.id;
    let queue = queues.get(guildId);

    if (!queue) {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId,
        adapterCreator: message.guild!.voiceAdapterCreator,
      });

      const player = createAudioPlayer();
      connection.subscribe(player);

      queue = { connection, player, songs: [] };
      queues.set(guildId, queue);
    }

    message.reply(
      `🎶 Añadidas ${tracks.length} canciones de la lista de reproducción a la cola.`
    );

    for (const track of tracks) {
      const video = await searchVideo(track.title ?? "");
      if (video) {
        queue.songs.push({ url: video.url, title: video.title });
      }
    }

    if (
      queue.player.state.status === AudioPlayerStatus.Idle &&
      queue.songs.length === tracks.length
    ) {
      queueHandler(guildId, message);
    }
    return;
  }

  const video = query.startsWith("http")
    ? { url: query, title: "" }
    : await searchVideo(query);

  if (!video || !video.url) {
    message.reply("No encontré esa canción.");
    return;
  }

  const voiceChannel = message.member?.voice.channel;
  if (!voiceChannel) {
    message.reply("🎙️ Debes estar en un canal de voz.");
    return;
  }

  const guildId = message.guild!.id;
  let queue = queues.get(guildId);

  if (!queue) {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: message.guild!.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    queue = { connection, player, songs: [] };
    queues.set(guildId, queue);
  }

  queue.songs.push({ url: video.url, title: video.title });
  message.reply(messageQueue(queue, video.title));

  if (
    queue.player.state.status === AudioPlayerStatus.Idle &&
    queue.songs.length === 1
  ) {
    queueHandler(guildId, message);
  }
};

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;

  const args = message.content.split(" ");
  const command = args.shift()?.toLowerCase();

  switch (command) {
    case "!next": {
      const guildId = message.guild!.id;
      nextSong(guildId, message);
      message.reply("⏭️ Canción saltada.");
      break;
    }
    case "!stop": {
      const guildId = message.guild!.id;
      stopPlayback(guildId);
      message.reply("⏹️ Reproducción detenida.");
      break;
    }
    case "!resume": {
      const guildId = message.guild!.id;
      resumePlayback(guildId);
      message.reply("▶️ Reproducción reanudada.");
      break;
    }
    case "!pause": {
      const guildId = message.guild!.id;
      pausePlayback(guildId);
      message.reply("⏸️ Reproducción pausada.");
      break;
    }
    case "!play": {
      await playMusic(message, args);
      break;
    }
    case "!current": {
      const guildId = message.guild!.id;
      currentPlayback(guildId, message);
      break;
    }
    default:
      break;
  }
});

client.login(process.env.DISCORD_TOKEN);
