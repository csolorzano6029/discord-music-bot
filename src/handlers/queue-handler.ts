// src/handlers/queue-handler.ts
import ytdl from "@distube/ytdl-core";
import { createAudioResource, AudioPlayerStatus } from "@discordjs/voice";
import { GuildQueue } from "../types";
import { Message } from "discord.js";

export const queues = new Map<string, GuildQueue>();

export const queueHandler = async (guildId: string, message?: Message) => {
  const queue = queues.get(guildId);
  if (!queue || queue.songs.length === 0) return;

  const { url, title } = queue.songs[0];
  try {
    const stream = ytdl(url, {
      filter: "audioonly",
      highWaterMark: 1 << 25, // Ajusta el tamaño del buffer
    });
    const resource = createAudioResource(stream);
    queue.player.play(resource);

    if (message) {
      message.reply(`🎶 Reproduciendo: ${title}`);
    }

    queue.player.once(AudioPlayerStatus.Playing, () =>
      console.log(`▶️  Reproduciendo: ${title}`)
    );

    queue.player.once(AudioPlayerStatus.Idle, () => {
      queue.songs.shift();
      queueHandler(guildId, message);
    });
  } catch (error: any) {
    console.error(`Error al reproducir la canción: ${error.message}`);
    message?.reply("❌ Hubo un problema al reproducir la canción.");
    queue.songs.shift();
    queueHandler(guildId, message);
  }
};

export const messageQueue = (queue: GuildQueue, title: string): string =>
  queue.songs?.length === 1
    ? `🎶 Reproduciendo: ${title}`
    : `🎶 Añadido a la cola: ${title}`;
