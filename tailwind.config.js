/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './App.tsx'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary:     '#7C5CE6',
        success:     '#22C55E',
        warning:     '#F59E0B',
        destructive: '#EF4444',
        background:  '#0A0A0A',
        card:        '#111111',
        border:      '#1F1F1F',
        foreground:  '#FAFAFA',
        muted:       '#767676',
        secondary:   '#1E1E1E',
      },
    },
  },
  plugins: [],
};
