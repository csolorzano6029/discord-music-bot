import axios from "axios";
import * as cheerio from "cheerio";

const getArtisSong = async (
  title: string
): Promise<
  { titleSong: string; artisName: string; url: string } | undefined
> => {
  try {
    const response = await axios.get(process.env.GENIUS_API_URL!, {
      headers: {
        Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}`,
      },
      params: {
        q: title,
      },
    });

    const hits = response.data.response.hits;

    if (hits.length === 0) {
      return;
    }

    const first = hits[0].result;
    console.log("🎵 Canción:", first.full_title);
    console.log("🔗 Link a la letra:", first.url);
    return {
      titleSong: first.title,
      artisName: first.artist_names,
      url: first.url,
    };
  } catch (error) {
    console.error("Error al obtener la url de la letra de la canción:", error);
  }
};

const getCompleteLyrics = async (title: string): Promise<string | null> => {
  try {
    const song = await getArtisSong(title);
    if (!song?.url) return null;

    const response = await axios.get(song.url);
    const $ = cheerio.load(response.data);

    // Genius suele usar .lyrics o [data-lyrics-container] para la letra
    let lyrics = "";

    $('[data-lyrics-container="true"]').each((_, el) => {
      const lines = $(el).html()?.split("<br>") || [];
      for (const line of lines) {
        const cleanLine = cheerio.load(line).text().trim();
        lyrics += cleanLine + "\n";
      }
    });

    return lyrics.trim() || null;
  } catch (error) {
    console.error("❌ Error haciendo scraping de la letra:", error);
    return null;
  }
};

export const getLyrics = async (title: string): Promise<string | null> => {
  try {
    const lyrics = await getCompleteLyrics(title);
    return lyrics;
  } catch (error) {
    console.error("Error al obtener la letra de la canción:", error);
    return "No se pudo obtener la letra de la canción.";
  }
};
