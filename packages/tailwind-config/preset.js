/**
 * Guryeeye brand tokens. Every app consumes this preset so colours, type and
 * radii stay consistent — change brand values here, not in individual apps.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effaf7',
          100: '#d7f2ea',
          200: '#b1e4d6',
          300: '#7fcfbc',
          400: '#4bb39e',
          500: '#2a9784',
          600: '#1c7a6b',
          700: '#186257',
          800: '#164f47',
          900: '#14423c',
          950: '#0a2623',
        },
        sand: {
          50: '#fdf8ef',
          100: '#f9eed8',
          200: '#f2dbb0',
          300: '#e9c27e',
          400: '#dfa34c',
          500: '#d68a2e',
          600: '#bd6e23',
          700: '#9d5420',
          800: '#804420',
          900: '#69391d',
        },
        ink: {
          DEFAULT: '#0f1b1a',
          muted: '#4b5a58',
          subtle: '#7d8b89',
        },
        status: {
          available: '#16a34a',
          occupied: '#2563eb',
          reserved: '#d97706',
          ooo: '#dc2626',
          maintenance: '#7c3aed',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 27 26 / 0.04), 0 4px 16px -4px rgb(15 27 26 / 0.08)',
        pop: '0 12px 40px -12px rgb(15 27 26 / 0.25)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgb(42 151 132 / 0.55)' },
          '100%': { boxShadow: '0 0 0 10px rgb(42 151 132 / 0)' },
        },
        'slide-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.2s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
