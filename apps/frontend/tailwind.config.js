/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          dark: 'rgb(9 14 26 / <alpha-value>)',
          card: 'rgb(22 31 44 / <alpha-value>)',
        },
        text: {
          main: 'rgb(248 250 252 / <alpha-value>)',
          muted: 'rgb(148 163 184 / <alpha-value>)',
        },
        accent: {
          purple: 'rgb(139 86 245 / <alpha-value>)',
          blue: 'rgb(13 166 242 / <alpha-value>)',
          orange: 'rgb(249 118 31 / <alpha-value>)',
          red: 'rgb(219 20 60 / <alpha-value>)',
          green: 'rgb(33 196 93 / <alpha-value>)',
        }
      },
      borderRadius: {
        DEFAULT: '16px',
      },
      boxShadow: {
        'glass': '0 4px 20px rgba(0, 0, 0, 0.2)',
        'overload': '0 0 30px hsla(348, 83%, 47%, 0.4)',
      }
    },
  },
  plugins: [],
}