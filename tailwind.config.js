/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── Typography ──────────────────────────────────────────
      fontFamily: {
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-syne)',  'sans-serif'],
        mono:    ['var(--font-jetbrains)', 'Menlo', 'monospace'],
      },

      // ── Color System ─────────────────────────────────────────
      colors: {
        // Backgrounds
        void:    '#050505',
        surface: '#0e0e0e',
        card:    '#111111',
        elevated:'#161616',
        border:  '#1e1e1e',
        subtle:  '#242424',

        // Text
        ink: {
          primary:   '#f0f0f0',
          secondary: '#888888',
          tertiary:  '#444444',
          muted:     '#2a2a2a',
        },

        // ── Neon Accent System ─────────────────────────────────
        neon: {
          // Primary — Bioluminescent Green (brand)
          green: {
            DEFAULT: '#0df27d',
            dim:     '#0df27d33',
            glow:    '#0df27d66',
            border:  '#0df27d44',
          },
          // Subject Accents
          anatomy: {
            DEFAULT: '#ff4d6d',
            dim:     '#ff4d6d1a',
            border:  '#ff4d6d44',
            glow:    '#ff4d6d55',
          },
          pharma: {
            DEFAULT: '#4df7c8',
            dim:     '#4df7c81a',
            border:  '#4df7c844',
            glow:    '#4df7c855',
          },
          physio: {
            DEFAULT: '#ffd60a',
            dim:     '#ffd60a1a',
            border:  '#ffd60a44',
            glow:    '#ffd60a55',
          },
          biochem: {
            DEFAULT: '#c77dff',
            dim:     '#c77dff1a',
            border:  '#c77dff44',
            glow:    '#c77dff55',
          },
          patho: {
            DEFAULT: '#ff6b35',
            dim:     '#ff6b351a',
            border:  '#ff6b3544',
            glow:    '#ff6b3555',
          },
          micro: {
            DEFAULT: '#00b4fc',
            dim:     '#00b4fc1a',
            border:  '#00b4fc44',
            glow:    '#00b4fc55',
          },
          // States
          review: {
            DEFAULT: '#ff9a00',
            dim:     '#ff9a001a',
            border:  '#ff9a0044',
          },
          success: {
            DEFAULT: '#0df27d',
            dim:     '#0df27d1a',
          },
          danger: {
            DEFAULT: '#ff4d4d',
            dim:     '#ff4d4d1a',
          },
        },
      },

      // ── Spacing Tokens ────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
      },

      // ── Border Radius ─────────────────────────────────────────
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },

      // ── Box Shadows (Neon Glow System) ────────────────────────
      boxShadow: {
        // Green glows
        'glow-sm':  '0 0 12px rgba(13, 242, 125, 0.25)',
        'glow-md':  '0 0 24px rgba(13, 242, 125, 0.35)',
        'glow-lg':  '0 0 48px rgba(13, 242, 125, 0.4)',
        'glow-xl':  '0 0 80px rgba(13, 242, 125, 0.5)',

        // Subject glows
        'glow-anatomy': '0 0 20px rgba(255, 77, 109, 0.35)',
        'glow-pharma':  '0 0 20px rgba(77, 247, 200, 0.35)',
        'glow-physio':  '0 0 20px rgba(255, 214, 10, 0.35)',
        'glow-biochem': '0 0 20px rgba(199, 125, 255, 0.35)',
        'glow-patho':   '0 0 20px rgba(255, 107, 53, 0.35)',
        'glow-micro':   '0 0 20px rgba(0, 180, 252, 0.35)',

        // Card elevation
        'card-sm': '0 2px 8px rgba(0,0,0,0.6)',
        'card-md': '0 4px 20px rgba(0,0,0,0.7)',
        'card-lg': '0 8px 40px rgba(0,0,0,0.8)',

        // Inset border glow
        'inset-glow': 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },

      // ── Backdrop Blur ─────────────────────────────────────────
      backdropBlur: {
        xs:   '4px',
        '4xl': '80px',
      },

      // ── Keyframe Animations ───────────────────────────────────
      keyframes: {
        // Entry animations
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-right': {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },

        // Looping effects
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 16px rgba(13, 242, 125, 0.3)' },
          '50%':       { boxShadow: '0 0 32px rgba(13, 242, 125, 0.6)' },
        },
        'scan': {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-6px)' },
        },
        'spin-slow': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        // Gradient shift for backgrounds
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':       { backgroundPosition: '100% 50%' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'flip-in': {
          '0%':   { transform: 'rotateY(90deg)', opacity: '0' },
          '100%': { transform: 'rotateY(0deg)', opacity: '1' },
        },
        'progress-indeterminate': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(250%)' },
        },
      },

      // ── Animation Utilities ───────────────────────────────────
      animation: {
        'fade-up':      'fade-up 0.4s ease both',
        'fade-up-slow': 'fade-up 0.7s ease both',
        'fade-in':      'fade-in 0.3s ease both',
        'slide-right':  'slide-right 0.4s ease both',
        'scale-in':     'scale-in 0.2s ease both',
        'pulse-glow':   'pulse-glow 2.5s ease-in-out infinite',
        'scan':         'scan 3s linear infinite',
        'blink':        'blink 1.2s step-start infinite',
        'float':        'float 3s ease-in-out infinite',
        'spin-slow':    'spin-slow 8s linear infinite',
        'gradient-x':   'gradient-x 6s ease infinite',
        'shimmer':      'shimmer 1.6s linear infinite',
        'flip-in':      'flip-in 0.35s ease both',
        'progress-indeterminate': 'progress-indeterminate 1.4s ease-in-out infinite',
      },

      // ── Background Sizes ──────────────────────────────────────
      backgroundSize: {
        '300%': '300%',
      },
    },
  },
  plugins: [],
}