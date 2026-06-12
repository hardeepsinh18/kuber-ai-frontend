const KuberLogo = ({ size = 36, className = '' }) => (
    <svg
        width={size}
        height={Math.round(size * 125 / 100)}
        viewBox="0 0 100 125"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        {/* Left stem + circle */}
        <rect x="19.5" y="39" width="7" height="21" rx="3.5" fill="currentColor" />
        <circle cx="23" cy="33" r="7.5" fill="currentColor" />

        {/* Center stem + circle */}
        <rect x="46.5" y="27" width="7" height="33" rx="3.5" fill="currentColor" />
        <circle cx="50" cy="21" r="7.5" fill="currentColor" />

        {/* Right stem + circle */}
        <rect x="73.5" y="17" width="7" height="43" rx="3.5" fill="currentColor" />
        <circle cx="77" cy="11" r="7.5" fill="currentColor" />

        {/* Pot rim — narrower */}
        <path d="M20,62 L80,62 L76,72 L24,72 Z" fill="currentColor" />

        {/* Pot body — narrower hexagonal */}
        <path d="M24,75 L76,75 L87,96 L78,122 L22,122 L13,96 Z" fill="currentColor" />
    </svg>
);

export default KuberLogo;
