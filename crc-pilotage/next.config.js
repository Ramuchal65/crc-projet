/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse et mammoth font des lectures de fichiers/require dynamiques
  // qui ne supportent pas d'être empaquetés par le bundler webpack de Next —
  // on les charge nativement via Node au runtime à la place.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"],
  },
};
module.exports = nextConfig;
