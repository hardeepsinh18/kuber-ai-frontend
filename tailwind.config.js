/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            screens: {
                'xs': '375px',  // Extra small devices (iPhone SE, small phones)
                // sm: '640px' (default Tailwind)
                // md: '768px' (default Tailwind)
                // lg: '1024px' (default Tailwind)
                'android-lg': '412px', // Large Android phones (Pixel, OnePlus, Samsung)
            },
            colors: {
                background: 'var(--background)',
                foreground: 'var(--foreground)',
                // KuberAI brand palette
                kuber: {
                    gold: '#D4A017',
                    'gold-light': '#F0C030',
                    'gold-bright': '#F5B800',
                    'gold-dark': '#A87810',
                    bg: '#090A07',
                    surface: '#111210',
                    border: '#1C1D1A',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
