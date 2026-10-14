/**
 * ISS-14 / SEC-C-001 — the SPA Content-Security-Policy, as a VERSIONED artifact.
 *
 * Why this file exists
 * --------------------
 * index.html described a CSP in comments, but no policy was ever emitted into
 * the build. Enforcement relied entirely on an out-of-repo CloudFront response-
 * headers policy: nothing in the repository pinned it, reviewed it, or failed
 * when it drifted. If that policy were edited or dropped, the SPA would silently
 * lose its XSS blast-radius control with no diff and no test to catch it.
 *
 * The policy below is injected into dist/index.html at build time (see the
 * `cspMeta` plugin in vite.config.js), so it is reviewable in a diff, travels
 * with the artifact, and is asserted by csp.test.js.
 *
 * Defence in depth, not a replacement
 * -----------------------------------
 * Keep the CloudFront header policy. A <meta http-equiv> CSP cannot express
 * frame-ancestors (clickjacking) or report-uri — those MUST stay at the edge as
 * real response headers. This artifact guarantees a baseline even if the edge
 * policy is absent; the edge remains the stronger enforcement point.
 *
 * Directive rationale (each entry is load-bearing — do not prune blindly)
 * ----------------------------------------------------------------------
 *   default-src 'self'   Deny by default; every exception below is deliberate.
 *
 *   script-src 'self' https://gateway.smallcase.com
 *                        The Smallcase Gateway SDK (broker holdings import) is
 *                        the first third-party script in this build —
 *                        <script src="https://gateway.smallcase.com/scdk/..."/>,
 *                        confirmed from Smallcase's own integration docs. Still
 *                        no 'unsafe-inline'/'unsafe-eval'. This is the
 *                        directive that actually contains XSS — keep it tight,
 *                        and don't widen it beyond this one confirmed origin.
 *
 *   style-src 'self' 'unsafe-inline'
 *                        REQUIRED. recharts/lightweight-charts and framer-motion
 *                        inject styles at runtime (verified: insertRule /
 *                        style-element creation in chart-vendor, motion-vendor
 *                        and index chunks). Dropping 'unsafe-inline' breaks
 *                        chart rendering and every animation. A nonce cannot be
 *                        used here because these are injected by library code
 *                        after load, not authored in our HTML.
 *
 *   img-src 'self' data: blob:
 *                        data: for inlined icons/sparklines; blob: for canvas
 *                        chart exports.
 *
 *   font-src 'self'      Montserrat + Gobold are self-hosted from public/fonts/
 *                        (SEC-C-009). No third-party font origin remains — this
 *                        is why fonts.googleapis.com / fonts.gstatic.com are
 *                        deliberately absent.
 *
 *   connect-src          Same-origin API (VITE_API_BASE is unset in the UAT/prod
 *                        build, so /api/* is same-origin) plus AWS Cognito for
 *                        auth. Amplify talks to cognito-idp.<region>.amazonaws.com
 *                        and the hosted-UI domain *.auth.<region>.amazoncognito.com.
 *                        Region is ap-south-1. Also gateway.smallcase.com — the
 *                        SDK widget makes its own XHR calls back to its host for
 *                        the broker-login flow; our own backend talks to
 *                        gatewayapi.smallcase.com server-side (httpx), which the
 *                        browser never reaches directly, so that origin is NOT
 *                        added here.
 *
 *   frame-src 'self' https://gateway.smallcase.com
 *                        The broker-login widget likely renders in an iframe
 *                        hosted on Smallcase's own domain (common pattern for
 *                        embedded broker-OAuth flows — keeps broker-specific
 *                        redirect domains, which vary per broker and aren't
 *                        enumerable here, inside an origin this page doesn't
 *                        need to trust directly). UNVERIFIED against the live
 *                        SDK — confirm during the first real sandbox test and
 *                        widen only if the widget actually needs more.
 *
 *   object-src 'none'    No <object>/<embed> — legacy plugin XSS vector.
 *   base-uri 'self'      Stops an injected <base> from re-pointing relative URLs.
 *   form-action 'self'   Stops an injected form from exfiltrating to a third party.
 *   frame-ancestors      Clickjacking. Ignored in <meta> (documented above), so
 *                        it is set at CloudFront; declared here as intent.
 *   upgrade-insecure-requests
 *                        Belt-and-braces against a stray http:// subresource.
 *
 * If you add a third-party origin (analytics, a CDN, an embed), add it here in
 * the same commit — that is the point of this file.
 */

const COGNITO_REGION = 'ap-south-1';

const SMALLCASE_GATEWAY_ORIGIN = 'https://gateway.smallcase.com';

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", SMALLCASE_GATEWAY_ORIGIN],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  'connect-src': [
    "'self'",
    `https://cognito-idp.${COGNITO_REGION}.amazonaws.com`,
    `https://*.auth.${COGNITO_REGION}.amazoncognito.com`,
    SMALLCASE_GATEWAY_ORIGIN,
  ],
  'frame-src': ["'self'", SMALLCASE_GATEWAY_ORIGIN],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
};

/** Serialize the directive map into a CSP header/meta value. */
export function buildCsp(directives = CSP_DIRECTIVES) {
  return Object.entries(directives)
    .map(([name, values]) => (values.length ? `${name} ${values.join(' ')}` : name))
    .join('; ');
}

/**
 * The <meta http-equiv> form. frame-ancestors is dropped because browsers
 * ignore it in a meta tag and log a console error for it — it is enforced by
 * the CloudFront header policy instead.
 */
export function buildMetaCsp() {
  const { 'frame-ancestors': _dropped, ...metaSafe } = CSP_DIRECTIVES;
  return buildCsp(metaSafe);
}
