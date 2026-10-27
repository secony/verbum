const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('bg'), surface: c('surface'), soft: c('soft'), line: c('line'),
        fg: c('fg'), muted: c('muted'), gold: c('gold'), olive: c('olive'),
        'on-olive': c('on-olive'), danger: c('danger'),
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Lora', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: { soft: '0 1px 2px rgb(0 0 0 / 0.04), 0 10px 28px -14px rgb(0 0 0 / 0.18)' },
      borderRadius: { xl: '0.9rem', '2xl': '1.15rem' },
    },
  },
  plugins: [],
};
