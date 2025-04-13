# Discord Music Bot

This is a music bot for Discord that allows playing songs from YouTube and Spotify playlists. It is developed in TypeScript using the `discord.js` library and other tools to handle audio and external APIs.

## Features

- Play songs from YouTube.
- Support for Spotify playlists.
- Commands to control playback, such as `!play`, `!pause`, `!resume`, `!stop`, `!next`, and `!current`.
- Queue management for songs.

## Requirements

- Node.js (version 18 or higher).
- A Discord account with permissions to create bots.
- Spotify API credentials.

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/csolorzano6029/discord-music-bot.git
   cd discord-music-bot
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the root of the project.
   - Add the following variables:
     ```env
     DISCORD_TOKEN=your_discord_token
     SPOTIFY_CLIENT_ID=your_spotify_client_id
     SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
     ```

## How to Obtain Environment Variable Values

### DISCORD_TOKEN

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a new application and then a bot.
3. Copy the bot token and paste it into the `DISCORD_TOKEN` variable.

### SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).
2. Create a new application.
3. Copy the `Client ID` and `Client Secret` and paste them into the `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` variables.

## Usage

1. Start the bot in development mode:

   ```bash
   npm run dev
   ```

2. Invite the bot to your Discord server using the authorization link generated in the [Discord Developer Portal](https://discord.com/developers/applications).

3. Use the commands in a text channel to interact with the bot:
   - `!play <song name or URL>`: Plays a song or playlist.
   - `!pause`: Pauses playback.
   - `!resume`: Resumes playback.
   - `!stop`: Stops playback and clears the queue.
   - `!next`: Skips to the next song in the queue.
   - `!current`: Displays the currently playing song.

## Contributions

Contributions are welcome. If you find an issue or have an idea to improve the bot, open an issue or submit a pull request.

## License

This project is licensed under the ISC License.
