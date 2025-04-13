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
import { GuildQueue } from "./types";

//let queue: string[] = [];
const queues = new Map<string, GuildQueue>();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const searchVideoName = async (query: string): Promise<string> => {
  const result = await ytSearch(query); // busca el video
  const video = result.videos.length > 0 ? result.videos[0] : null; // toma el primer resultado
  return video ? video.title : ""; // devuelve el título del video
};

const searchAndGetUrl = async (query: string): Promise<string | null> => {
  const result = await ytSearch(query);
  const video = result.videos.length > 0 ? result.videos[0] : null;
  return video ? video.url : null;
};

const messageQueue = (queue: GuildQueue, title: string): string => {
  if (queue.songs?.length === 1) {
    return `🎶 Reproduciendo: ${title}`;
  }

  return `🎶 Añadido a la cola: ${title}`;
};

const queueHandler = async (guildId: string) => {
  const queue = queues.get(guildId);
  if (!queue || queue.songs.length === 0) return;

  const { url, title } = queue.songs[0]; // primera canción de la cola

  const stream = ytdl(url, { filter: "audioonly" });
  const resource = createAudioResource(stream);
  queue.player.play(resource);

  queue.player.once(AudioPlayerStatus.Playing, () => {
    console.log(`▶️ Reproduciendo: ${title}`);
  });

  queue.player.once(AudioPlayerStatus.Idle, () => {
    queue.songs.shift(); // quita la canción actual
    queueHandler(guildId); // reproduce la siguiente
  });
};

/* const playMusic = async (url: string, message: Message): Promise<void> => {
  const voiceChannel = message.member?.voice.channel;

  if (!voiceChannel) {
    message.reply("🎙️ Debes estar en un canal de voz.");
    return;
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: message.guild!.id,
    adapterCreator: message.guild!.voiceAdapterCreator,
  });

  const stream = ytdl(url, { filter: "audioonly" });
  const resource = createAudioResource(stream);
  const player = createAudioPlayer();

  player.play(resource);
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    if (queue.length > 0) {
      const nextUrl = queue.shift()!;
      const stream = ytdl(nextUrl, { filter: "audioonly" });
      const resource = createAudioResource(stream);
      player.play(resource);
    } else {
      console.log("🎶 La cola está vacía, pero sigo conectado.");
    }
  });

  message.reply(`🎵 Reproduciendo: ${url}`);
}; */

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user?.tag}`);
});

client.on("messageCreate", async (message: Message) => {
  if (!message.content.startsWith("!play") || message.author.bot) return;

  const args = message.content.split(" ").slice(1);

  if (!args.length) return message.reply("Debes escribir una canción o URL.");

  const query = args.join(" ");
  const url = query.startsWith("http")
    ? query
    : (await searchAndGetUrl(query)) || "";

  if (!url) return message.reply("No encontré esa canción.");

  const title = await searchVideoName(query); // puedes obtenerlo de ytSearch si quieres algo más bonito

  const voiceChannel = message.member?.voice.channel;
  if (!voiceChannel) return message.reply("🎙️ Debes estar en un canal de voz.");

  const guildId = message.guild!.id;

  let queue = queues.get(guildId);

  // Si no hay cola, la creamos y comenzamos a reproducir
  if (!queue) {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: message.guild!.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    queue = {
      connection,
      player,
      songs: [],
    };

    queues.set(guildId, queue);

    player.on(AudioPlayerStatus.Idle, () => {
      queueHandler(guildId);
    });
  }

  // Agregamos la canción a la cola
  queue.songs.push({ url, title });
  const messageQueueResponse = messageQueue(queue, title);
  message.reply(messageQueueResponse);

  // Si el player no está reproduciendo nada, empieza
  if (
    queue.player.state.status === AudioPlayerStatus.Idle &&
    queue.songs.length === 1
  ) {
    queueHandler(guildId);
  }
});

client.login(process.env.DISCORD_TOKEN);
