import "dotenv/config";
import { Client, GatewayIntentBits, Message } from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnection,
} from "@discordjs/voice";
import ytdl from "@distube/ytdl-core";
import ytSearch from "yt-search";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const searchAndGetUrl = async (query: string): Promise<string | null> => {
  const result = await ytSearch(query);
  const video = result.videos.length > 0 ? result.videos[0] : null;
  return video ? video.url : null;
};

const playMusic = async (url: string, message: Message): Promise<void> => {
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
    connection.destroy();
  });

  message.reply(`🎵 Reproduciendo: ${url}`);
};

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user?.tag}`);
});

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;

  const args = message.content.split(" ").slice(1);
  if (message.content.startsWith("!play")) {
    if (!args.length) {
      return message.reply("Debes escribir una canción o URL.");
    }

    let url = args.join(" ");
    if (!url.startsWith("http")) {
      const found = await searchAndGetUrl(url);
      if (!found) return message.reply("No encontré esa canción.");
      url = found;
    }

    playMusic(url, message);
  }
});

client.login(process.env.DISCORD_TOKEN);
