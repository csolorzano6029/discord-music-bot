import { GuildQueue } from "../types";
import { Message } from "discord.js";
import { queueHandler } from "./queue-handler";
import { AudioPlayerStatus } from "@discordjs/voice";

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
