/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors';
export default {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
    "./node_modules/preline/preline.js",
  ],
  darkMode: "class",
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      black: "#000000",
      white: "#ffffff",
      gray: colors.gray,
      indigo: colors.indigo,
      neutral: colors.neutral,  // Used mainly for text color
      green: {
        50: "#00FF33",
        100: "#00ff66",
        400: "#00cc33",
        500: "#009900",
      },
      yellow: {
        50: "#fefce8",
        100: "#fef9c3",
        400: "#facc15",
        500: "#eab308",
      }, // Accent colors, used mainly for star color, heading and buttons
      orange: {
        100: "#ffedd5",
        200: "#fed7aa",
        300: "#fb713b",
        400: "#fa5a15",
        500: "#e14d0b",
        600: "#ea580c",
      },
      purple: {
        100: "#7800CF",
        200: "#53008F",
        300: "#3D0069",
        400: "#00677F",
        500: "#1F0036",
      },
      blue: {
        100: "#0091E6",
        200: "#0079BF",
        300: "#006199",
        400: "#00598C",
        500: "#26355E",
      },
      teal: {
        100: "#30CED8",
        200: "#00B2A9",
        300: "#009991",
        400: "#008079",
        500: "#006761",
      },
      red: colors.red, // Used for bookmark icon
      zinc: colors.zinc, // Used mainly for box-shadow
    },
    extend: {},
  },
  plugins: [
    require("tailwindcss/nesting"),
    require("preline/plugin"),
    require("@tailwindcss/forms"),
  ],
};
