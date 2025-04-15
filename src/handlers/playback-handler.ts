import { GuildQueue } from "../types";
import { Message } from "discord.js";
import { messageQueue, queueHandler } from "./queue-handler";
import { AudioPlayerStatus, joinVoiceChannel } from "@discordjs/voice";
import {
  createAudioPlayerWithErrorHandling,
  searchVideo,
} from "./player-handler";
import { playSpotifyPlaylist } from "./spotify-handler";

const queues = new Map<string, GuildQueue>();

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
    message.reply(`🎶 Actualmente reproduciendo: ${currentSong}`);
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
