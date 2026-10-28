import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0b10",
        card: "#12141c",
        line: "#232634",
        accent: "#7c6cff",
      },
    },
  },
  plugins: [],
};
export default config;
