import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  // Ces classes sont composées dynamiquement (ex: `text-${priorite}`) donc
  // Tailwind ne les détecte pas par analyse statique — sans ce safelist,
  // elles seraient silencieusement absentes du CSS généré.
  safelist: [
    "text-haute", "text-moyenne", "text-basse",
    "text-critique", "text-eleve", "text-modere",
    "border-critique/30", "border-eleve/30", "border-modere/30",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1C1E22",
        paper: "#F7F6F3",
        line: "#DCD9D2",
        haute: "#B54834",
        moyenne: "#B08A2E",
        basse: "#5B7A63",
        critique: "#B02E2E",
        eleve: "#C4772A",
        modere: "#A99226",
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
