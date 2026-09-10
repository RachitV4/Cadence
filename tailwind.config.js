/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cadence: {
          bg: '#F5F4F1',
          surface: '#FCFCFA',
          surface2: '#EBEAE5',
          border: '#DFDDDA',
          text: '#222220',
          secondary: '#5C5C58',
          muted: '#8F8E8A',
          accent: '#3C493F', // A sophisticated deep neutral green/grey
          accentSoft: '#E8EBE9',
          accentLine: '#B4BCB6',
          danger: '#B33A3A',
          dangerSoft: '#F6E6E6',
          warning: '#A67324',
          warningSoft: '#F5EFE6',
          success: '#3A7D4E',
          successSoft: '#E6EFE8',
        },
      },
      fontFamily: {
        display: ['Lora', 'ui-serif', 'Georgia', 'serif'],
        body: ['Lora', 'ui-serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
};
