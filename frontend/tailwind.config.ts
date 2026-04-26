import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./services/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: "var(--surface)",
        "surface-alt": "var(--surface-alt)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        brand: "var(--brand)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        border: "var(--border)"
      },
      boxShadow: {
        soft: "0 20px 40px -24px rgba(15, 23, 42, 0.45)",
        card: "0 12px 24px -14px rgba(15, 23, 42, 0.35)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.35rem"
      }
    }
  },
  plugins: []
};

export default config;
