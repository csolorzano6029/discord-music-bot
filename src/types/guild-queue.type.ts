import { createAudioPlayer, joinVoiceChannel } from "@discordjs/voice";
import { Song } from "./song.type";

export type GuildQueue = {
  connection: ReturnType<typeof joinVoiceChannel>;
  player: ReturnType<typeof createAudioPlayer>;
  songs: Song[];
};
