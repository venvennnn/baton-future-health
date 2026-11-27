import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        arabic: ["var(--font-naskh)", "Noto Naskh Arabic", "serif"],
      },
      colors: {
        ink: "#131b2e",
        mute: "#444653",
      },
      boxShadow: {
        card: "0 4px 12px -2px rgba(0,0,0,0.05), 0 2px 6px -1px rgba(0,0,0,0.02)",
        window: "0 20px 40px -15px rgba(0,0,0,0.07), 0 0 1px 1px rgba(0,0,0,0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
