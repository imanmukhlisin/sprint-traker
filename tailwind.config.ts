import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#e8ffee", // Mint green
        primary: {
          DEFAULT: "#ff2d78", // Hot pink neon
          foreground: "#ffffff",
          hover: "#e61a66",
        },
        "text-main": "#002112", // Dark forest green
        "text-muted": "#5b3f44", // Muted mauve
        card: {
          DEFAULT: "#ffffff",
          foreground: "#002112",
        },
        border: "rgba(255, 45, 120, 0.3)",
      },
      fontFamily: {
        sora: ["var(--font-sora)", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"],
        space: ["var(--font-space)", "sans-serif"],
      },
      boxShadow: {
        "neon-hover": "0 0 16px rgba(255, 45, 120, 0.4)",
        "neon-border": "inset 0 0 12px rgba(255, 45, 120, 0.1), 0 0 8px rgba(255, 45, 120, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
