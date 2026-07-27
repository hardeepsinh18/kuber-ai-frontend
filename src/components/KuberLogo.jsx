/**
 * Venty brand logo (official mark from "Venty Logo 1 Final").
 * Venty is a product by 72 Street.
 *
 * `size` = rendered height in px (width scales to the asset's aspect ratio).
 * `variant`:
 *   'mark'       → robot mark, white-face — reads best on dark UI (default)
 *   'mark-light' → robot mark, dark-face — for light backgrounds
 *   'full'       → full logo (mark + VENTY^AI + tagline) for dark backgrounds
 *   'full-light' → full logo for light backgrounds
 *   'wordmark'   → VENTY^AI wordmark + tagline, no robot
 */
// NOTE: the -v2 suffix on the full logos is a cache-bust, not a redesign.
// These files are served with `Cache-Control: immutable, max-age=1yr` but their
// names are NOT content-hashed, so a browser that cached the old (mis-padded)
// venty-full-dark.png would keep it for a year and never see the fix. Renaming
// the URL is the only way to reach those clients. If either full logo is ever
// re-exported, bump to -v3 rather than overwriting in place.
const ASSETS = {
    mark: '/brand/venty-mark.png',
    'mark-light': '/brand/venty-mark-light.png',
    full: '/brand/venty-full-dark-v2.png',
    'full-light': '/brand/venty-full-light-v2.png',
    wordmark: '/brand/venty-wordmark-dark.png',
    'wordmark-light': '/brand/venty-wordmark-light.png',
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
