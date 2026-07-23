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
const ASSETS = {
    mark: '/brand/venty-mark.png',
    'mark-light': '/brand/venty-mark-light.png',
    full: '/brand/venty-full-dark.png',
    'full-light': '/brand/venty-full-light.png',
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
