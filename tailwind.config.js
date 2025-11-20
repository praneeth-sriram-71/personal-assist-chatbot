/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './types.ts',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'grid-glow':
          'linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 0), linear-gradient(0deg, rgba(255,255,255,0.05) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
};

