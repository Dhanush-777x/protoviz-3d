/**
 * \file tailwind.config.js
 * \brief Tailwind CSS theme configuration for the Protocol Visualizer UI.
 *
 * Defines the global design system including colors, animations,
 * glassmorphism effects, and tutorial-driven visual cues.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base colors
        'bg-main': '#0e1118',
        'bg-panel': '#141825',
        'bg-input': '#181d2d',

        // Text colors
        'text-main': '#e8ebf2',
        'text-muted': 'rgba(232, 235, 242, 0.65)',
        'text-dim': 'rgba(232, 235, 242, 0.45)',
        'text-dark': '#0b0d12',

        // Primary colors
        primary: {
          DEFAULT: '#a6aecc',
          soft: 'rgba(166, 174, 204, 0.6)',
          dim: 'rgba(166, 174, 204, 0.25)',
          border: 'rgba(166, 174, 204, 0.35)',
        },

        // Secondary colors
        secondary: {
          DEFAULT: '#504171',
          soft: 'rgba(80, 65, 113, 0.6)',
          dim: 'rgba(80, 65, 113, 0.25)',
        },

        // Accent colors
        accent: {
          DEFAULT: '#9370ad',
          soft: 'rgba(147, 112, 173, 0.6)',
          dim: 'rgba(147, 112, 173, 0.25)',
        },

        // Status colors
        'status-bg': 'rgba(166, 174, 204, 0.12)',
        'status-border': 'rgba(166, 174, 204, 0.3)',

        // Error colors
        error: {
          DEFAULT: '#ff6b6b',
          dark: '#d84c4c',
        },
      },
      backgroundImage: {
        // Primary violet gradient (used for buttons, highlights)
        'glass-gradient-primary':
          'linear-gradient(135deg, rgba(147, 112, 173, 0.9), rgba(166, 174, 204, 0.9))',
      },
      boxShadow: {
        'glow-glass-primary': '0 4px 18px rgba(147,112,173,0.35)',
        'glow-glass-primary-hover': '0 0 26px rgba(166,174,204,0.55)',
      },
      backdropBlur: {
        glass: '18px',
      },
      animation: {
        'pulse-error': 'pulse-error 0.6s infinite',
        'tutorial-pulse': 'tutorial-pulse 1.8s ease-in-out infinite',
        'modal-in': 'modal-in 220ms ease-out',
        'dim-to-brain':
          'dim-to-brain 720ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
      },
      keyframes: {
        'pulse-error': {
          '0%, 100%': { boxShadow: '0 0 18px rgba(255, 107, 107, 0.6)' },
          '50%': { boxShadow: '0 0 26px rgba(255, 107, 107, 0.9)' },
        },
        'tutorial-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 10px rgba(147, 112, 173, 0.35)',
          },
          '50%': {
            boxShadow: '0 0 22px rgba(147, 112, 173, 0.85)',
          },
        },
        'modal-in': {
          '0%': {
            opacity: '0',
            transform: 'scale(0.95) translateY(8px)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1) translateY(0)',
          },
        },
        'dim-to-brain': {
          '0%': {
            clipPath: 'circle(150% at 50% 50%)',
            opacity: '0',
          },
          '30%': {
            opacity: '0.3',
          },
          '100%': {
            /* adjust % based on brain button position */
            clipPath: 'circle(30px at 97.8% 50%)',
            opacity: '0.3',
          },
        },
      },
    },
  },
  plugins: [],
};
