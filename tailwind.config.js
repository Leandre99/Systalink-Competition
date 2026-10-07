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
          DEFAULT: '#0F6E56', // Vert Émeraude Kora
          dark: '#0A4F3E',
          navy: '#0A1118',
          light: '#ECFDF5',
          hover: '#0D5C48',
        },
        kora: {
          DEFAULT: '#0F6E56',
          dark: '#0A4F3E',
          light: '#ECFDF5',
          hover: '#0D5C48',
        },
        amber: {
          DEFAULT: '#F2A93B', // Ambre Solaire CADev
          light: '#FFFBEB',
          dark: '#D97706',
          hover: '#E59828',
        },
        coral: {
          DEFAULT: '#E4572E', // Corail SOS
          light: '#FEF2F2',
          dark: '#C2410C',
          hover: '#CD3D17',
        },
        success: {
          DEFAULT: '#0F6E56',
          light: '#ECFDF5',
          hover: '#0A4F3E',
        },
        warning: {
          DEFAULT: '#F2A93B',
          light: '#FFFBEB',
        },
        danger: {
          DEFAULT: '#E4572E',
          light: '#FEF2F2',
        },
        navy: {
          DEFAULT: '#0A1118',
          surface: '#101A24',
          card: '#142230',
          border: '#1E2E40',
          light: '#1E293B',
        },
        background: '#F6F8F7',
        surface: '#FFFFFF',
        border: '#E2E8F0',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'sm': '0 2px 8px rgba(10, 17, 24, 0.04)',
        'md': '0 8px 24px rgba(10, 17, 24, 0.07)',
        'lg': '0 16px 40px rgba(10, 17, 24, 0.10)',
        'glow-emerald': '0 0 25px -4px rgba(15, 110, 86, 0.35)',
        'glow-amber': '0 0 25px -4px rgba(242, 169, 59, 0.45)',
        'glow-coral': '0 0 25px -4px rgba(228, 87, 46, 0.35)',
        'card': '0 8px 30px rgba(10, 17, 24, 0.06)',
        'card-hover': '0 20px 40px -10px rgba(15, 110, 86, 0.15)',
      },
    },
  },
  plugins: [],
}
