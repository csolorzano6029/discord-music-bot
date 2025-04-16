import axios from "axios";

/**
 * Obtiene la letra de una canción dado su título y artista.
 * @param title Título de la canción.
 * @param artist Artista de la canción.
 * @returns Letra de la canción o un mensaje indicando que no se encontró.
 */
export const getLyrics = async (
  title: string,
  artist?: string
): Promise<string> => {
  try {
    const query = artist ? `${title} ${artist}` : title;
    const response = await axios.get(
      `https://api.lyrics.ovh/v1/${artist}/${title}`
    );
    return response.data.lyrics || "No se encontró la letra de la canción.";
  } catch (error) {
    console.error("Error al obtener la letra de la canción:", error);
    return "No se pudo obtener la letra de la canción.";
  }
};
