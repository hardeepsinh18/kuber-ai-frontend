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
                // ── 72 Street brand palette (product: Venty) ──
                street: {
                    yellow: '#fdd405',        // primary brand accent
                    'yellow-bright': '#ffe23f',
                    'yellow-dark': '#e0bd00',
                    black: '#121315',         // brand ink / near-black bg
                    green: '#0e9e37',         // underline / positive accent
                    'green-dark': '#0b7f2c',
                    white: '#ffffff',
                    gunmetal: '#22383c',      // secondary (limited)
                    grey: '#efefef',          // secondary (limited)
                },
                // Legacy KuberAI tokens remapped to the 72 Street palette so every
                // existing `kuber-*` utility class rebrands automatically.
                kuber: {
                    gold: '#fdd405',
                    'gold-light': '#ffe23f',
                    'gold-bright': '#ffe23f',
                    'gold-dark': '#e0bd00',
                    bg: '#121315',
                    surface: '#1a1b1d',
                    border: '#2a2c2f',
                },
            },
            fontFamily: {
                // Body / UI = Montserrat (brand secondary). Display / headings = Gobold (brand primary).
                sans: ['Montserrat', 'system-ui', '-apple-system', 'sans-serif'],
                display: ['Gobold', 'Montserrat', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
