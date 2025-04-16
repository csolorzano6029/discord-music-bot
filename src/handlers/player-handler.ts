// src/handlers/player-handler.ts
import {
  AudioPlayerStatus,
  createAudioPlayer,
  joinVoiceChannel,
} from "@discordjs/voice";
import { SearchVideo } from "../interfaces";
import ytSearch from "yt-search";
import { Message } from "discord.js";
import { queueHandler } from "./queue-handler";
import { queues } from "./queue-handler";

export const createAudioPlayerWithErrorHandling = (guildId: string) => {
  const player = createAudioPlayer();

  player.on("error", (error) => {
    console.error(`AudioPlayerError: ${error.message}`);
    if (error.resource) {
      console.error("Error en el recurso de audio:", error.resource);
    }
    queueHandler(guildId); // Reintenta reproducir la siguiente canción
  });

  return player;
};

export const searchVideo = async (
  query: string
): Promise<SearchVideo | null> => {
  const result = await ytSearch(query);
  const video = result.videos[0] || null;
  return video ? { title: video.title, url: video.url } : null;
};

export const playYoutubePlaylist = async (query: string, message: Message) => {
  const playlistMatch = query.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (playlistMatch) {
    const playlistId = playlistMatch[1];
    const playlist = await ytSearch({ listId: playlistId });

    if (!playlist || !playlist.videos.length) {
      message.reply("No se encontraron videos en la lista de reproducción.");
      return;
    }

    const guildId = message.guild!.id;
    let queue = queues.get(guildId);

    if (!queue) {
      const voiceChannel = message.member?.voice.channel;
      if (!voiceChannel) {
        message.reply("🎙️ Debes estar en un canal de voz.");
        return;
      }

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId,
        adapterCreator: message.guild!.voiceAdapterCreator,
      });

      const player = createAudioPlayerWithErrorHandling(guildId);
      connection.subscribe(player);

      queue = { connection, player, songs: [] };
      queues.set(guildId, queue);
    }

    // Añadir la primera canción y comenzar a reproducirla inmediatamente
    const firstVideo = await searchVideo(playlist.videos[0].title ?? "");
    if (firstVideo) {
      message.reply(
        `▶️  Añadidas ${playlist.videos.length} canciones de la lista de reproducción a la cola.`
      );

      queue.songs.push({ url: firstVideo.url, title: firstVideo.title });
      message.reply(`▶️  Reproduciendo: ${firstVideo.title}`);

      if (queue.player.state.status === AudioPlayerStatus.Idle) {
        queueHandler(guildId);
      }
    }

    // Cargar el resto de las canciones en segundo plano
    playlist.videos.slice(1).forEach(async (data) => {
      const video = await searchVideo(data.title ?? "");
      if (video) {
        queue.songs.push({ url: video.url, title: video.title });
      }
    });
  } else {
    message.reply("No se pudo obtener la lista de reproducción.");
  }
};
