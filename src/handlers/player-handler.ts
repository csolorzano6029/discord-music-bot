// src/handlers/player-handler.ts
import { createAudioPlayer } from "@discordjs/voice";
import { SearchVideo } from "../interfaces";
import ytSearch from "yt-search";

export const createAudioPlayerWithErrorHandling = () => {
  const player = createAudioPlayer();

  player.on("error", (error) => {
    console.error(`AudioPlayerError: ${error.message}`);
    console.error(error);
    if (error.resource) {
      console.error("Error en el recurso de audio:", error.resource);
    }
  });

  return player;
};

export const searchVideo = async (
  query: string
): Promise<SearchVideo | null> => {
  const result = await ytSearch(query);
  const video = result.videos[0] || null;
  return video ? { title: video.title, url: video.url } : null;
};
