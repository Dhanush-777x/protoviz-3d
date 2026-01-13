/**
 * \file tailwind.config.js
 * \brief Tailwind CSS theme configuration for the Protocol Visualizer UI.
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
                'bg-main': '#0e1118',
                'bg-panel': '#141825',
                'bg-input': '#181d2d',
                'text-main': '#e8ebf2',
                'text-muted': 'rgba(232, 235, 242, 0.65)',
                'text-dim': 'rgba(232, 235, 242, 0.45)',
                'text-dark': '#0b0d12',
                primary: {
                    DEFAULT: '#a6aecc',
                    soft: 'rgba(166, 174, 204, 0.6)',
                    dim: 'rgba(166, 174, 204, 0.25)',
                    border: 'rgba(166, 174, 204, 0.35)',
                },
                secondary: {
                    DEFAULT: '#504171',
                    soft: 'rgba(80, 65, 113, 0.6)',
                    dim: 'rgba(80, 65, 113, 0.25)',
                },
                accent: {
                    DEFAULT: '#9370ad',
                    soft: 'rgba(147, 112, 173, 0.6)',
                    dim: 'rgba(147, 112, 173, 0.25)',
                },
                'status-bg': 'rgba(166, 174, 204, 0.12)',
                'status-border': 'rgba(166, 174, 204, 0.3)',
                error: {
                    DEFAULT: '#ff6b6b',
                    dark: '#d84c4c',
                },
            },
            backgroundImage: {
                'glass-gradient-primary':
                    'linear-gradient(135deg, rgba(147, 112, 173, 0.9), rgba(166, 174, 204, 0.9))',
                'glass-gradient-error':
                    'linear-gradient(135deg, rgba(255, 120, 120, 0.85), rgba(255, 160, 160, 0.85))',
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
                'dim-to-question': 'dim-to-question 1.2s ease-out forwards',
                'fade-in-up': 'fade-in-up 0.4s ease-out both',
                'fade-slide-up': 'fade-slide-up 200ms ease-out both',
            },
            keyframes: {
                'pulse-error': {
                    '0%, 100%': {
                        boxShadow: '0 0 18px rgba(255, 107, 107, 0.6)',
                    },
                    '50%': { boxShadow: '0 0 26px rgba(255, 107, 107, 0.9)' },
                },
                'tutorial-pulse': {
                    '0%, 100%': {
                        boxShadow: '0 0 10px rgba(147, 112, 173, 0.35)',
                    },
                    '50%': { boxShadow: '0 0 22px rgba(147, 112, 173, 0.85)' },
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
                    '0%': { clipPath: 'circle(150% at 50% 50%)', opacity: '0' },
                    '30%': { opacity: '0.3' },
                    '100%': {
                        clipPath: 'circle(30px at 97.8% 50%)',
                        opacity: '0.3',
                    },
                },
                'dim-to-question': {
                    '0%': { clipPath: 'circle(150% at 50% 50%)', opacity: '0' },
                    '30%': { opacity: '0.35' },
                    '100%': {
                        clipPath: 'circle(20px at 98% 95%)',
                        opacity: '0.35',
                    },
                },
                'fade-in-up': {
                    '0%': { opacity: '0', transform: 'translateY(12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'fade-slide-up': {
                    '0%': { opacity: '0', transform: 'translateY(5px)' },
                    '100%': { opacity: '1', transform: 'translateY(-10px)' },
                },
            },
        },
    },
    plugins: [],
};
