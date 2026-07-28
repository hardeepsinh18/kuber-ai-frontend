/**
 * Venty brand logo (official mark from "Venty Logo 1 Final").
 * Venty is a product by 72 Street.
 *
 * `size` = rendered height in px (width scales to the asset's aspect ratio).
 * `variant`:
 *   'mark'       → robot mark for DARK UI: yellow frame, black face, white eyes (default)
 *   'mark-light' → robot mark for LIGHT UI: all-black line-art robot
 *   'full'       → full logo (mark + VENTY^AI + tagline) for dark backgrounds
 *   'full-light' → full logo, all-black, for light backgrounds
 *   'wordmark'   → VENTY^AI wordmark + tagline, no robot
 */
// The version suffix on these filenames is a cache-bust, not a redesign. Files
// are served `Cache-Control: immutable, max-age=1yr` but names are NOT
// content-hashed, so a browser that cached an old file keeps it for a year.
// Renaming the URL is the only way to reach those clients — bump the suffix
// (mark→v2, full→v3) rather than overwriting a name in place.
//   v2/v3 (2026-07-28): robot face is now black on dark (no white face); the
//   light-theme marks/logo are all-black per brand "Venty Logo 1 Final" pages 3/4/0/1.
const ASSETS = {
    mark: '/brand/venty-mark-v2.png',
    'mark-light': '/brand/venty-mark-light-v2.png',
    full: '/brand/venty-full-dark-v3.png',
    'full-light': '/brand/venty-full-light-v3.png',
    wordmark: '/brand/venty-wordmark-dark.png',
    'wordmark-light': '/brand/venty-wordmark-light-v2.png',
};

const KuberLogo = ({ size = 36, variant = 'mark', className = '', alt = 'Venty' }) => (
    <img
        src={ASSETS[variant] || ASSETS.mark}
        alt={alt}
        height={size}
        style={{ height: size, width: 'auto', display: 'block' }}
        className={className}
        draggable={false}
    />
);

export default KuberLogo;
