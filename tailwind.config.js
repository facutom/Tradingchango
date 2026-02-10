
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      colors: {
        primary: '#0b141a',
        muted: '#5a5e6b',
        'muted-dark': '#a0a0a0',
        'border-light': '#e0e3eb',
        'border-dark': '#233138',
        'trading-green': '#008a45',
        'trading-red': '#f23645',
        'star-gold': '#f2a900',
        'chart-green': '#00c853',
        'chart-red': '#ff3b30',
        'bg-card-light': '#f9f9f9',
        'bg-card-dark': '#1f2c34'
      }
    }
  },
  plugins: [],
}