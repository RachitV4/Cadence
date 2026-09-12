/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cadence: {
          bg: '#18181B',           // Matte Charcoal (Zinc 900)
          surface: '#27272A',      // Elevated Charcoal (Zinc 800)
          surface2: '#3F3F46',     // Hover states (Zinc 700)
          border: '#3F3F46',       // Subtle dividing lines
          text: '#F4F4F5',         // Soft Off-White (Zinc 100)
          secondary: '#A1A1AA',    // Ash Gray (Zinc 400)
          muted: '#71717A',        // Muted Gray (Zinc 500)
          accent: '#10B981',       // Clean Emerald Green (Accent)
          accentSoft: '#064E3B',   // Deep Emerald for backgrounds
          accentLine: '#059669',   // Mid Emerald
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
