import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#131b2e",
        mute: "#444653",
      },
      boxShadow: {
        card: "0 1px 8px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
