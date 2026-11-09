/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf4",
          100: "#eef6f0",
          200: "#d9eadf",
          300: "#b3d8c7",
          400: "#8cc1a5",
          500: "#7fd8a8",
          600: "#6bc48f",
          700: "#4a9e73",
          800: "#2e9e6b",
          900: "#1b6b4e",
          950: "#0d3a2e",
        },
        dark: {
          900: "#0a0f0d",
          800: "#131c18",
          700: "#17241f",
          600: "#2a3b33",
        },
        danger: {
          500: "#e8837a",
          100: "rgba(232, 131, 122, 0.15)",
        },
        warn: {
          500: "#f2c96e",
          100: "rgba(242, 201, 110, 0.12)",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "10px",
        DEFAULT: "12px",
        md: "14px",
        lg: "16px",
        xl: "18px",
        "2xl": "20px",
      },
      boxShadow: {
        card: "0 12px 32px -8px rgba(0,0,0,0.45)",
        hover: "0 16px 40px -10px rgba(0,0,0,0.55)",
        brand: "0 6px 18px -5px rgba(127,216,168,0.4)",
      },
      transitionTimingFunction: {
        "bounce": "cubic-bezier(0.23, 1, 0.32, 1)",
      },
      animation: {
        "slide-in": "slideIn 0.25s ease",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
}
