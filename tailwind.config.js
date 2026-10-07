/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./shared/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1E3A8A',
          navy: '#0F172A',
          light: '#EFF6FF',
          hover: '#1D4ED8',
        },
        success: {
          DEFAULT: '#0F766E',
          light: '#ECFDF5',
          hover: '#0D9488',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#E4572E',
          light: '#FEE2E2',
        },
        navy: '#0F172A',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        border: '#E2E8F0',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'sm': '0 2px 8px rgba(15, 23, 42, 0.04)',
        'md': '0 8px 24px rgba(15, 23, 42, 0.07)',
        'lg': '0 16px 40px rgba(15, 23, 42, 0.10)',
        'blue': '0 10px 25px -5px rgba(37, 99, 235, 0.25)',
      },
    },
  },
  plugins: [],
}
