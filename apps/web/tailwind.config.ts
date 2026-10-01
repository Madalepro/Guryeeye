import type { Config } from 'tailwindcss';
import preset from '@guryeeye/tailwind-config';

export default {
  presets: [preset],
  content: ['./src/**/*.{ts,tsx}'],
} satisfies Config;
