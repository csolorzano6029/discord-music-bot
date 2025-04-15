import SpotifyWebApi from "spotify-web-api-node";

export const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

export const refreshSpotifyToken = async () => {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body["access_token"]);
    console.log("🔄 Token de Spotify renovado");
  } catch (error) {
    console.error("Error al renovar el token de Spotify", error);
  }
};

export const getSpotifyPlaylistTracks = async (playlistUrl: string) => {
  const playlistId = playlistUrl.split("playlist/")[1]?.split("?")[0];
  if (!playlistId) return null;

  try {
    const data = await spotifyApi.getPlaylistTracks(playlistId);
    return data.body.items.map((item) => ({
      title: item.track?.name,
      url: item.track?.external_urls.spotify,
    }));
  } catch (error) {
    console.error(
      "Error al obtener la lista de reproducción de Spotify",
      error
    );
    return null;
  }
};
