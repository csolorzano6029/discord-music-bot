// src/handlers/player-handler.ts
import { createAudioPlayer } from "@discordjs/voice";

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
