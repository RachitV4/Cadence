/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cadence: {
          bg: '#0A1128',           // Deep Navy (Dominant)
          surface: '#121A38',      // Slightly lighter Navy for cards
          surface2: '#1C274C',     // Hover states / secondary surface
          border: '#2D3A63',       // Subtle border color
          text: '#F7F9FC',         // Soft Pearl White (Supporting)
          secondary: '#CBD5E1',    // Light slate for secondary text
          muted: '#64748B',        // Cool Slate (Muted Tone)
          accent: '#7C3AED',       // Electric Lavender (Accent)
          accentSoft: '#4C1D95',   // Deep Lavender for badge backgrounds
          accentLine: '#6D28D9',   // Vibrant line accent
          danger: '#EF4444',
          dangerSoft: '#450A0A',
          warning: '#F59E0B',
          warningSoft: '#451A03',
          success: '#10B981',
          successSoft: '#064E3B',
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
