import "dotenv/config";
import { Message } from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  AudioPlayerStatus,
} from "@discordjs/voice";
import ytSearch from "yt-search";
import { GuildQueue } from "./types";
import { SearchVideo } from "./interfaces";
import { client } from "./handlers/discord-handler";
import {
  refreshSpotifyToken,
  spotifyApi,
  getSpotifyPlaylistTracks,
} from "./handlers/spotify-handler";
import {
  currentPlayback,
  nextSong,
  pausePlayback,
  resumePlayback,
  stopPlayback,
} from "./handlers/playback-handler";
import { queueHandler } from "./handlers/queue-handler";

const queues = new Map<string, GuildQueue>();

// Obtener token de acceso de Spotify
spotifyApi.clientCredentialsGrant().then(
  (data) => spotifyApi.setAccessToken(data.body["access_token"]),
  (err) => console.error("Error al obtener el token de Spotify", err)
);

setInterval(refreshSpotifyToken, 1000 * 60 * 30); // Renueva el token cada 30 minutos

const searchVideo = async (query: string): Promise<SearchVideo | null> => {
  const result = await ytSearch(query);
  const video = result.videos[0] || null;
  return video ? { title: video.title, url: video.url } : null;
};

const messageQueue = (queue: GuildQueue, title: string): string =>
  queue.songs?.length === 1
    ? `🎶 Reproduciendo: ${title}`
    : `🎶 Añadido a la cola: ${title}`;

/* const nextSong = (guildId: string, message: Message) => {
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
}; */

client.once("ready", () =>
  console.log(`✅ Bot conectado como ${client.user?.tag}`)
);

const createAudioPlayerWithErrorHandling = () => {
  const player = createAudioPlayer();

  player.on("error", (error) => {
    console.error(`AudioPlayerError: ${error.message}`);
    console.error(error);
    if (error.resource) {
      console.error("Error en el recurso de audio:", error.resource);
    }
  });

  return player;
};

const playSpotifyPlaylist = async (message: Message, query: string) => {
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

    const player = createAudioPlayerWithErrorHandling();
    connection.subscribe(player);

    queue = { connection, player, songs: [] };
    queues.set(guildId, queue);
  }

  // Añadir la primera canción y comenzar a reproducirla inmediatamente
  const firstTrack = await searchVideo(tracks[0].title ?? "");
  if (firstTrack) {
    message.reply(
      `🎶 Añadidas ${tracks.length} canciones de la lista de reproducción a la cola.`
    );

    queue.songs.push({ url: firstTrack.url, title: firstTrack.title });
    message.reply(`🎶 Reproduciendo: ${firstTrack.title}`);

    if (queue.player.state.status === AudioPlayerStatus.Idle) {
      queueHandler(guildId);
    }
  }

  // Cargar el resto de las canciones en segundo plano
  tracks.slice(1).forEach(async (track) => {
    const video = await searchVideo(track.title ?? "");
    if (video) {
      queue.songs.push({ url: video.url, title: video.title });
    }
  });
};

const playMusic = async (message: Message, args: string[]) => {
  if (!args.length) {
    message.reply("Debes escribir una canción o URL.");
    return;
  }

  const query = args.join(" ");

  if (query.includes("spotify.com/playlist")) {
    await playSpotifyPlaylist(message, query);
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

    const player = createAudioPlayerWithErrorHandling();
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
    queueHandler(guildId);
  }
};

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;

  const args = message.content.split(" ");
  const command = args.shift()?.toLowerCase();

  try {
    switch (command) {
      case "!next": {
        const guildId = message.guild!.id;
        message.reply("⏭️ Canción saltada.");
        nextSong(guildId, message);
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
  } catch (error) {
    console.error(error);
  }
});

client.login(process.env.DISCORD_TOKEN);
