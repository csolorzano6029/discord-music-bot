import "dotenv/config";
import { Message } from "discord.js";
import { client } from "./handlers/discord-handler";
import {
  currentPlayback,
  helpCommand,
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
      case "!n": {
        const guildId = message.guild!.id;
        message.reply("⏭️ Canción saltada.");
        nextSong(guildId, message);
        break;
      }
      case "!s": {
        const guildId = message.guild!.id;
        stopPlayback(guildId);
        message.reply("⏹️ Reproducción detenida.");
        break;
      }
      case "!r": {
        const guildId = message.guild!.id;
        resumePlayback(guildId);
        message.reply("▶️ Reproducción reanudada.");
        break;
      }
      case "!ps": {
        const guildId = message.guild!.id;
        pausePlayback(guildId);
        message.reply("⏸️ Reproducción pausada.");
        break;
      }
      case "!p": {
        await playMusic(message, args);
        break;
      }
      case "!l": {
        const guildId = message.guild!.id;
        await lyricsPlayBack(guildId, message);
        break;
      }
      case "!c": {
        const guildId = message.guild!.id;
        currentPlayback(guildId, message);
        break;
      }
      case "!h": {
        helpCommand(message);
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
