/** 
 * @type {import('tailwindcss').Config} 
 */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          mono: ['JetBrains Mono', 'Menlo', 'monospace'],
          display: ['Inter', 'system-ui', 'sans-serif'],
        },
        boxShadow: {
            // Elegant Stripe-like soft shadows
            'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.04), 0 0 3px rgba(0,0,0,0.02)',
            'premium-hover': '0 10px 30px -4px rgba(0, 0, 0, 0.08), 0 4px 10px -2px rgba(0,0,0,0.04)',
            'nav': '0 20px 40px -8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02)',
        },
        letterSpacing: {
          tighter: '-.04em',
          tight: '-.02em',
          normal: '0',
          wide: '.025em',
        },
        animation: {
          'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
        keyframes: {
          fadeInUp: {
            '0%': { opacity: 0, transform: 'translateY(10px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' },
          }
        }
      },
    },
    plugins: [],
  }
