const KuberLogo = ({ size = 36, className = '' }) => (
    <svg
        width={size}
        height={Math.round(size * 120 / 100)}
        viewBox="0 0 100 120"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <defs>
            <linearGradient id="kl_stem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
            </linearGradient>
        </defs>

        {/* Trend line connecting circle tops */}
        <polyline
            points="20,32 50,19 80,9"
            stroke="currentColor"
            strokeOpacity="0.45"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        />

        {/* Left stem + circle */}
        <rect x="17" y="39" width="6" height="21" rx="3" fill="url(#kl_stem)" />
        <circle cx="20" cy="32" r="7" fill="currentColor" />

        {/* Center stem + circle */}
        <rect x="47" y="26" width="6" height="34" rx="3" fill="url(#kl_stem)" />
        <circle cx="50" cy="19" r="7" fill="currentColor" />

        {/* Right stem + circle */}
        <rect x="77" y="16" width="6" height="44" rx="3" fill="url(#kl_stem)" />
        <circle cx="80" cy="9" r="7" fill="currentColor" />

        {/* Pot rim */}
        <path d="M7,62 L93,62 L88,72 L12,72 Z" fill="currentColor" />

        {/* Pot body */}
        <path d="M14,76 L86,76 L96,96 L86,119 L14,119 L4,96 Z" fill="currentColor" />
    </svg>
);

export default KuberLogo;
