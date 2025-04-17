import { Message } from "discord.js";
import { messageQueue, queueHandler } from "./queue-handler";
import { AudioPlayerStatus, joinVoiceChannel } from "@discordjs/voice";
import {
  createAudioPlayerWithErrorHandling,
  playYoutubePlaylist,
  searchVideo,
} from "./player-handler";
import { playSpotifyPlaylist } from "./spotify-handler";
import { queues } from "./queue-handler";
import { getLyrics } from "./lyrics-handler";

export const nextSong = (guildId: string, message: Message) => {
  const queue = queues.get(guildId);
  if (!queue || queue.songs.length === 0) return;

  queue.songs.shift();
  queueHandler(guildId, message);
};

export const stopPlayback = (guildId: string) => {
  const queue = queues.get(guildId);
  if (!queue) return;

  queue.songs = [];
  queue.player.stop();
  queue.connection.destroy();
  queues.delete(guildId);
};

export const resumePlayback = (guildId: string) => {
  const queue = queues.get(guildId);
  if (!queue || queue.player.state.status !== AudioPlayerStatus.Paused) return;

  queue.player.unpause();
};

export const pausePlayback = (guildId: string) => {
  const queue = queues.get(guildId);
  if (!queue || queue.player.state.status !== AudioPlayerStatus.Playing) return;

  queue.player.pause();
};

export const currentPlayback = (guildId: string, message: Message): void => {
  const currentSong = getCurrentSong(guildId);
  if (currentSong) {
    message.reply(`▶️  Actualmente reproduciendo: ${currentSong}`);
  } else {
    message.reply("No hay ninguna canción reproduciéndose en este momento.");
  }
};

export const getCurrentSong = (guildId: string): string | null => {
  const queue = queues.get(guildId);
  if (!queue || queue.songs.length === 0) return null;

  return queue.songs[0].title;
};

export const playMusic = async (message: Message, args: string[]) => {
  if (!args.length) {
    message.reply("Debes escribir una canción o URL.");
    return;
  }

  const query = args.join(" ");

  if (query.includes("spotify.com/playlist")) {
    await playSpotifyPlaylist(message, query);
    return;
  }

  if (query.includes("youtube.com/playlist")) {
    await playYoutubePlaylist(query, message);
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

    const player = createAudioPlayerWithErrorHandling(guildId);
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

export const lyricsPlayBack = async (guildId: string, message: Message) => {
  const currentSong = getCurrentSong(guildId);

  if (!currentSong) {
    message.reply("No hay ninguna canción reproduciéndose en este momento.");
    return;
  }

  // Limpia el título de la canción eliminando palabras innecesarias
  const cleanedTitle = currentSong
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]|oficial|video|lyrics|-|hd|\d+p/gi, "")
    .trim();

  // Obtén la letra de la canción usando el título limpio
  const lyrics = await getLyrics(cleanedTitle);

  if (lyrics) {
    const cleanedLyrics = lyrics
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n"); // mantenemos un solo \n entre líneas reales

    const chunks: string[] = [];
    let currentChunk = "";

    for (const line of cleanedLyrics.split("\n")) {
      if ((currentChunk + "\n" + line).length > 2000) {
        chunks.push(currentChunk);
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? "\n" : "") + line;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    await message.reply(`🎵 Letra de la canción:\n\n`);
    for (const chunk of chunks.entries()) {
      if (message.channel.isTextBased()) {
        await message.reply(`${chunk}`);
      }
    }
  } else {
    message.reply("❌ No se pudo encontrar la letra de la canción.");
  }
};
