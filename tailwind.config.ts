import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { colors: { ink: '#080609', surface: '#110c15', line: '#2b2033', purple: '#a855f7', lavender: '#c4b5fd', quiet: '#9a8fa2', signal: '#9ee8bb' }, fontFamily: { serif: ['Instrument Serif', 'Georgia', 'serif'], sans: ['Instrument Sans', 'ui-sans-serif', 'sans-serif'] } } },
  plugins: []
};
export default config;
