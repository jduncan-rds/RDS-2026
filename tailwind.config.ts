import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F5F0E8',
        brown: {
          DEFAULT: '#3D2B1F',
          light: '#6B4C3B',
        },
        rust: '#A85C3A',
        sage: '#7A8C6E',
        'dusty-blue': '#6B85A0',
      },
      fontFamily: {
        heading: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        body: ['"EB Garamond"', '"Libre Baskerville"', 'Georgia', 'serif'],
        ui: ['Raleway', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
