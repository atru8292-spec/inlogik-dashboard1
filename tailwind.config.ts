import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Inlogik brand
        inlogik: {
          50: "#E6FAF8",
          100: "#C0F2EC",
          200: "#8BE5DA",
          300: "#56D8C8",
          400: "#2DC6B3",
          500: "#14B5A6", // главный teal с лого
          600: "#0E8278",
          700: "#0A6B62",
          800: "#08544D",
          900: "#053D37",
        },
        // Status palette
        good: "#16A34A",
        warn: "#F59E0B",
        bad: "#DC2626",
        muted: "#6B7280",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Inter", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
