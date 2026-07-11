import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50: "#F0FAFA",
          100: "#D0F0F0",
          200: "#A0E0E0",
          300: "#70D0D0",
          400: "#4DC8C8",
          500: "#3ABABA",
          600: "#2A9A9A",
          700: "#1A7A7A",
          800: "#0A5A5A",
          900: "#003A3A",
        },
        coral: {
          50: "#FFF0F2",
          100: "#FFD0D6",
          200: "#F5A0AA",
          300: "#EE7A88",
          400: "#E8637A",
          500: "#D94F66",
          600: "#C03A52",
          700: "#A02840",
          800: "#80182E",
          900: "#600A1E",
        },
        navy: {
          50: "#F0F2F8",
          100: "#D0D5E8",
          200: "#A0AACE",
          300: "#7080B4",
          400: "#4A5A9A",
          500: "#334080",
          600: "#1A2860",
          700: "#1A1A2E",
          800: "#10102A",
          900: "#080820",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 12px rgba(77, 200, 200, 0.08)",
        "card-hover": "0 4px 20px rgba(77, 200, 200, 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
