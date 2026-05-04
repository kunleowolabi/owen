/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#5ac499',
          navy: '#1A2340',
        }
      }
    },
  },
  plugins: [],
}
