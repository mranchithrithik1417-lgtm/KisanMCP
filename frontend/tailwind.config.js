/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2E7D32',
          dark: '#1B5E20',
          light: '#4CAF50',
          subtle: '#E8F5E9'
        },
        accent: {
          DEFAULT: '#F9A825',
          dark: '#F57F17',
          light: '#FFF176',
          subtle: '#FFFDE7'
        },
        cream: '#FFF8E1',
        charcoal: '#1B1B1B'
      }
    },
  },
  plugins: [],
}
