/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#1B3A7A', dark: '#0f1e47', light: '#2a4d9e' },
        gold: { DEFAULT: '#F5A623', dark: '#d4891a', light: '#f7b84b' },
        cream: { DEFAULT: '#FAFAF8', dark: '#F0F0EA' },
      },
      fontFamily: {
        tajawal: ['Tajawal', 'sans-serif'],
        grotesk: ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
