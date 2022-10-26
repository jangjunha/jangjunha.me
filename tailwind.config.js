/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./content/**/*.html", "./templates/**/*.html"],
  theme: {
    listStyleType: {
      hashtag: '"#"',
    },
    extend: {
      colors: {
        tint: {
          600: "#489",
          500: "#8aa", // text title
          400: "#bcc", // text subtitle
          200: "#dee", // bg, [white]stroke
          100: "#f2fafa", // bg active
        },
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-links': theme('colors.tint[600]'),
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            '.list-hashtag::before': {
              color: 'red',
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
