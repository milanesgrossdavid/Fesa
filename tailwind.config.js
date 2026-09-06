/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["SF Pro Text", "System Font", "SF Pro", "system-ui", "-apple-system", "Roboto", "sans-serif"],
        sf: ["SF Pro Text", "System Font", "SF Pro", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}