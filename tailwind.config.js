/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { yellow: '#FFC928', cream: '#FFF8E7', navy: '#24324A', sky: '#67C8F3', orange: '#FFAA55' },
      },
      fontFamily: { sans: ['"Nunito Variable"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
