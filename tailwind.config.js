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
        // Backgrounds — pure black cinematic environment
        void:    '#050505',
        surface: '#0a0d0b',
        card:    '#0e1110',
        elevated:'#141816',
        border:  '#1e2220',
        subtle:  '#2a2e2c',

        // Text — calibrated for pure black with WCAG-friendly contrast
        ink: {
          primary:   '#f0f0f0',   // ~17:1 on #050505 — headings, key labels
          secondary: '#9ca3a0',   // ~5.5:1 — body text, descriptions
          tertiary:  '#6b7270',   // ~3.5:1 — captions, metadata, timestamps
          muted:     '#3d4240',   // ~2:1 — disabled, placeholders, dividers
        },

        // ── Accent System ──────────────────────────────────────
        neon: {
          // Primary — Neon Emerald (brand identity)
          green: {
            DEFAULT: '#0df27d',
            dim:     '#0df27d20',
            glow:    '#0df27d50',
            border:  '#0df27d40',
          },
          // Subject Accents — restored originals
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
            DEFAULT: '#fb923c',
            dim:     '#fb923c1a',
            border:  '#fb923c35',
            glow:    '#fb923c40',
          },
          micro: {
            DEFAULT: '#38bdf8',
            dim:     '#38bdf81a',
            border:  '#38bdf835',
            glow:    '#38bdf840',
          },
          // Teal secondary
          cyan: {
            DEFAULT: '#22d3ee',
            dim:     '#22d3ee1a',
            border:  '#22d3ee35',
            glow:    '#22d3ee40',
          },
          // AI accent — deep electric violet
          ai: {
            DEFAULT: '#7c5cfc',
            dim:     '#7c5cfc1a',
            border:  '#7c5cfc35',
            glow:    '#7c5cfc40',
          },
          // States
          review: {
            DEFAULT: '#f59e0b',
            dim:     '#f59e0b1a',
            border:  '#f59e0b44',
          },
          success: {
            DEFAULT: '#0df27d',
            dim:     '#0df27d1a',
          },
          danger: {
            DEFAULT: '#ef4444',
            dim:     '#ef44441a',
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

      // ── Box Shadows (Depth + Restrained Glow) ───────────
      boxShadow: {
        // Default card shadow — deep spatial depth
        'card':     '0 2px 8px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',

        // Neon emerald glows — restrained, purposeful
        'glow-sm':  '0 0 6px rgba(13, 242, 125, 0.08)',
        'glow-md':  '0 0 10px rgba(13, 242, 125, 0.12)',
        'glow-lg':  '0 0 14px rgba(13, 242, 125, 0.15)',

        // Subject glows — calmed for premium feel
        'glow-anatomy': '0 0 10px rgba(255, 77, 109, 0.1)',
        'glow-pharma':  '0 0 10px rgba(77, 247, 200, 0.1)',
        'glow-physio':  '0 0 10px rgba(255, 214, 10, 0.1)',
        'glow-biochem': '0 0 10px rgba(199, 125, 255, 0.1)',
        'glow-patho':   '0 0 10px rgba(251, 146, 60, 0.08)',
        'glow-micro':   '0 0 10px rgba(56, 189, 248, 0.08)',

        // Card elevation — layered depth for pure black
        'card-sm': '0 1px 2px rgba(0,0,0,0.4)',
        'card-md': '0 4px 16px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.4)',
        'card-lg': '0 12px 40px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)',

        // Inset highlight — subtle top-edge light
        'inset-glow': 'inset 0 1px 0 rgba(255,255,255,0.03)',
        'inset-highlight': 'inset 0 1px 0 rgba(255,255,255,0.03)',
      },

      // ── Backdrop Blur ─────────────────────────────────────────
      backdropBlur: {
        xs:   '4px',
        '4xl': '80px',
      },

      // ── Keyframe Animations ───────────────────────────────────
      keyframes: {
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
        'shimmer': {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },

      // ── Animation Utilities ───────────────────────────────────
      animation: {
        'fade-up':      'fade-up 0.4s ease both',
        'fade-in':      'fade-in 0.3s ease both',
        'slide-right':  'slide-right 0.4s ease both',
        'scale-in':     'scale-in 0.2s ease both',
      },

      // ── Background Sizes ──────────────────────────────────────
      backgroundSize: {
        '300%': '300%',
      },
    },
  },
  plugins: [],
}