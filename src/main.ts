import "dotenv/config";
import { Message } from "discord.js";
import { client } from "./handlers/discord-handler";
import {
  currentPlayback,
  lyricsPlayBack,
  nextSong,
  pausePlayback,
  playMusic,
  resumePlayback,
  stopPlayback,
} from "./handlers/playback-handler";

client.once("ready", () =>
  console.log(`✅ Bot conectado como ${client.user?.tag}`)
);

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
      case "!lyrics": {
        const guildId = message.guild!.id;
        await lyricsPlayBack(guildId, message);
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
