{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x  # Asegúrate de usar la versión de Node.js que necesitas
    pkgs.ffmpeg       # Instala FFmpeg
  ];
}