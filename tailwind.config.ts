import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        ink: { DEFAULT: "#101820", 800: "#17222B", 700: "#202D37", 600: "#2B3944" },
        paper: "#F5F4EF",
        lime: { DEFAULT: "#B7F36B", 600: "#9FDB52", 700: "#7FB83A" },
        slate: { DEFAULT: "#708090", light: "#9AA7B4" },
        line: "#E5E4DC",
        success: "#23845B",
        solved: "#39824A",
        warning: "#B7791F",
        error: { DEFAULT: "#C44747", dark: "#E45C55" },
      },
      fontFamily: {
        heading: ["Manrope", "Hind Siliguri", "system-ui", "sans-serif"],
        sans: ["Inter", "Hind Siliguri", "system-ui", "sans-serif"],
        bn: ["Hind Siliguri", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: { sm: "4px", DEFAULT: "6px", md: "8px", lg: "10px" },
      boxShadow: { card: "0 1px 2px rgba(16,24,32,0.04)", lift: "0 6px 24px -12px rgba(16,24,32,0.25)" },
      keyframes: {
        "slide-up": { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
      },
      animation: { "slide-up": "slide-up 180ms ease-out" },
    },
  },
  plugins: [animate, typography],
} satisfies Config;
