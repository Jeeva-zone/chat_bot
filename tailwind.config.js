/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "var(--surface)",
        panel: "var(--panel)",
        elevated: "var(--elevated)",
        line: "var(--line)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        brand: "var(--brand)",
        "brand-soft": "var(--brand-soft)",
        ok: "var(--ok)",
        warn: "var(--warn)",
        err: "var(--err)",
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "JetBrains Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 180ms ease-out both",
        "pulse-dot": "pulse-dot 1.1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
