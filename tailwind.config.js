/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./content/**/*.{html,md}", "./templates/**/*.html"],
  theme: {
    listStyleType: {
      hashtag: '"#"',
    },
    extend: {
      colors: {
        tint: {
          900: "#1E3F48",
          800: "#3C7E8B",
          600: "#489",
          350: "#8aa",
          300: "#bcc",
          200: "#dee", // bg, [white]stroke
          100: "#f2fafa", // bg active
        },
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-links': theme('colors.tint[800]'),
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
