/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        foreground: "white",
        background: "#121212",
        primary: "#CAFF33",
      },
      width: {
        "47px": "47px",
        "69px": "69px",
      },
      height: {
        "17px": "17px",
      },
      inset: {
        "1226px": "1226px",
        "1204px": "1204px",
        "19px": "19px",
      },
      fontFamily: {
        montserrat: ["Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
};
