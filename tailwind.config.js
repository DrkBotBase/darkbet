/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        darkBg: {
          start: '#0f172a', // slate-900
          via: '#581c87',  // purple-900
          end: '#0f172a'   // slate-900
        }
      }
    },
  },
  plugins: [],
}
