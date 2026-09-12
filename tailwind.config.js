/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cadence: {
          bg: '#FBFAF9',
          surface: '#FFFFFF',
          surface2: '#F5F5F2',
          border: '#E7E7E2',
          text: '#16181D',
          secondary: '#565B66',
          muted: '#8A909C',
          accent: '#4C5FD5',
          accentSoft: '#EEF0FC',
          accentLine: '#C7CEF4',
          danger: '#D64545',
          dangerSoft: '#FCEEEE',
          warning: '#B9770E',
          warningSoft: '#FAF1E1',
          success: '#2E9E5B',
          successSoft: '#E9F6EE',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
};
