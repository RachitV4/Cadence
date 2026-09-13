/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cadence: {
          bg: 'rgb(var(--color-bg) / <alpha-value>)',
          surface: 'rgb(var(--color-surface) / <alpha-value>)',
          surface2: 'rgb(var(--color-surface2) / <alpha-value>)',
          border: 'rgb(var(--color-border) / <alpha-value>)',
          text: 'rgb(var(--color-text) / <alpha-value>)',
          secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
          muted: 'rgb(var(--color-muted) / <alpha-value>)',
          accent: 'rgb(var(--color-accent) / <alpha-value>)',
          accentFg: 'rgb(var(--color-accent-fg) / <alpha-value>)',
          accentSoft: 'rgb(var(--color-accentSoft) / <alpha-value>)',
          accentLine: 'rgb(var(--color-accentLine) / <alpha-value>)',
          danger: 'rgb(var(--color-danger) / <alpha-value>)',
          dangerSoft: 'rgb(var(--color-dangerSoft) / <alpha-value>)',
          warning: 'rgb(var(--color-warning) / <alpha-value>)',
          warningSoft: 'rgb(var(--color-warningSoft) / <alpha-value>)',
          success: 'rgb(var(--color-success) / <alpha-value>)',
          successSoft: 'rgb(var(--color-successSoft) / <alpha-value>)',
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
