/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        rose: {
          DEFAULT: '#8B3A52',
          light: '#C4768A',
          pale: '#F5E6EB',
          dark: '#5C2235',
        },
        gold: {
          DEFAULT: '#B8860B',
          light: '#E2C060',
          pale: '#FBF5E0',
          dark: '#8A6408',
        },
        cream: {
          DEFAULT: '#FDF6EE',
          dark: '#F0E5D8',
          darker: '#E5D5C5',
        },
        ink: {
          DEFAULT: '#2C1810',
          muted: '#7A5C52',
          light: '#A8897F',
        },
      },
    },
  },
  plugins: [],
}
