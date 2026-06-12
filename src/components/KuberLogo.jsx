const KuberLogo = ({ size = 36, className = '' }) => (
    <svg
        width={size}
        height={Math.round(size * 50 / 44)}
        viewBox="0 0 44 50"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        {/* Left bar */}
        <rect x="6" y="6" width="5" height="13" rx="2.5" />
        {/* Center bar — tallest */}
        <rect x="19.5" y="2" width="5" height="17" rx="2.5" />
        {/* Right bar */}
        <rect x="33" y="8" width="5" height="11" rx="2.5" />

        {/* Dots at bar tops */}
        <circle cx="8.5" cy="4" r="3" />
        <circle cx="22" cy="0" r="3" />
        <circle cx="35.5" cy="6.5" r="3" />

        {/* Pot rim */}
        <rect x="3" y="20" width="38" height="5.5" rx="2.75" />

        {/* Pot body — wider at top, tapers to base */}
        <path d="M6 26 L2 44 Q1.5 49 10 49 L34 49 Q42.5 49 42 44 L38 26 Z" />

        {/* Decorative horizontal stripes */}
        <rect x="3.5" y="33" width="37" height="2.5" rx="1.25" fill="rgba(0,0,0,0.18)" />
        <rect x="4" y="40.5" width="36" height="2" rx="1" fill="rgba(0,0,0,0.13)" />
    </svg>
);

export default KuberLogo;
