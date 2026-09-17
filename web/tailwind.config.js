/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: "#B8BFD6",
          card: "#ECEEF5",
          cardLight: "#F5F6FA",
          accent: "#8E94F2",
          purpleGlass: "#6E62B5",
          lilacGlow: "#D1D5F5",
          greenSoft: "#4EBA88",
          textPrimary: "#1E202B",
          textSecondary: "#6F7285",
          textMuted: "#9B9EB2",
        },
      },
      borderRadius: {
        "3xl": "1.85rem",
        "4xl": "2.3rem",
      },
      boxShadow: {
        "soft-card": "0 12px 32px -4px rgba(78, 86, 115, 0.12), 0 4px 12px 0 rgba(78, 86, 115, 0.06)",
        "float-badge": "0 8px 24px rgba(66, 56, 110, 0.22)",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
    },
  },
  plugins: [],
};
