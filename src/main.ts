import "dotenv/config";
import { Message } from "discord.js";
import { client } from "./handlers/discord-handler";
import { refreshSpotifyToken, spotifyApi } from "./handlers/spotify-handler";
import {
  currentPlayback,
  nextSong,
  pausePlayback,
  playMusic,
  resumePlayback,
  stopPlayback,
} from "./handlers/playback-handler";

// Obtener token de acceso de Spotify
spotifyApi.clientCredentialsGrant().then(
  (data) => spotifyApi.setAccessToken(data.body["access_token"]),
  (err) => console.error("Error al obtener el token de Spotify", err)
);

setInterval(refreshSpotifyToken, 1000 * 60 * 30); // Renueva el token cada 30 minutos

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
