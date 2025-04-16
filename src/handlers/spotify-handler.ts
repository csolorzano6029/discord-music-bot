import { Message } from "discord.js";
import SpotifyWebApi from "spotify-web-api-node";
import { GuildQueue } from "../types";
import { joinVoiceChannel, AudioPlayerStatus } from "@discordjs/voice";
import {
  createAudioPlayerWithErrorHandling,
  searchVideo,
} from "./player-handler";
import { queueHandler } from "./queue-handler";
import { queues } from "./queue-handler";

export const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

export const refreshSpotifyToken = async () => {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body["access_token"]);
    console.log("🔄 Token de Spotify renovado");
  } catch (error) {
    console.error("Error al renovar el token de Spotify", error);
  }
};

export const getSpotifyPlaylistTracks = async (playlistUrl: string) => {
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

export const playSpotifyPlaylist = async (message: Message, query: string) => {
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
      `▶️  Añadidas ${tracks.length} canciones de la lista de reproducción a la cola.`
    );

    queue.songs.push({ url: firstTrack.url, title: firstTrack.title });
    message.reply(`▶️  Reproduciendo: ${firstTrack.title}`);

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
