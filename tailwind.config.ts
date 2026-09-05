import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
        sans: ['var(--font-sans)', 'sans-serif'],
      },
      colors: {
        paper: '#FAF9F5',
        ink: '#181B22',
        inksoft: '#565B66',
        rule: '#E2E0D6',
        signal: '#B5540B',
        up: '#2F6D4C',
        down: '#A23B33',
      },
    },
  },
  plugins: [],
};
export default config;
