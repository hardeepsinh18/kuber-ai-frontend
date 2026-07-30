import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/**
 * SEC-C-009 — Montserrat used to load from fonts.googleapis.com. That put a third-party
 * origin inside the trusted computing base for a render-blocking stylesheet with NO
 * possible SRI pin (Google generates the CSS per user-agent, so its bytes differ between
 * visitors and no hash is stable), and disclosed every visitor's IP to Google on first
 * paint. Self-hosting closes the gap rather than patching it.
 *
 * QA-C-008 — /login had no landmark at all: the sign-in card sat in a bare <div> and the
 * decorative backdrop was orphaned content, which is what axe reported as a region
 * violation.
 */

describe('SEC-C-009: fonts are self-hosted', () => {
    it('index.html has no live Google Fonts stylesheet link', () => {
        const html = read('index.html');
        // Strip HTML comments first — the explanation of WHY this was removed legitimately
        // names the origin, and matching that would make this test vacuous.
        const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
        expect(withoutComments).not.toContain('fonts.googleapis.com');
        expect(withoutComments).not.toContain('fonts.gstatic.com');
    });

    it('index.html has no preconnect to a font CDN', () => {
        const withoutComments = read('index.html').replace(/<!--[\s\S]*?-->/g, '');
        expect(withoutComments).not.toMatch(/rel=["']preconnect["']/);
    });

    it('the woff2 files are actually present in public/fonts', () => {
        for (const f of ['montserrat-var-latin.woff2', 'montserrat-var-latin-ext.woff2']) {
            const p = path.join(ROOT, 'public', 'fonts', f);
            expect(fs.existsSync(p), `${f} missing`).toBe(true);
            // A truncated or error-page download would be tiny; a real subset is >20 KB.
            expect(fs.statSync(p).size).toBeGreaterThan(20_000);
        }
    });

    it('index.css declares Montserrat locally across the full weight range', () => {
        const css = read('src/index.css');
        expect(css).toContain("font-family: 'Montserrat'");
        expect(css).toContain('/fonts/montserrat-var-latin.woff2');
        expect(css).toContain('/fonts/montserrat-var-latin-ext.woff2');
        // Variable font: one file serves 400-800. If someone replaces this with a single
        // static weight, the UI silently loses its bolds.
        expect(css).toContain('font-weight: 400 800');
    });

    it('every @font-face src points at our own origin', () => {
        const css = read('src/index.css');
        const urls = [...css.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)].map((m) => m[1]);
        expect(urls.length).toBeGreaterThan(0);
        for (const u of urls) {
            expect(u.startsWith('/'), `external font url: ${u}`).toBe(true);
        }
    });

    it('Montserrat is still the configured body typeface', () => {
        // Guards against "fixing" the CSP by simply dropping the brand font.
        expect(read('tailwind.config.js')).toContain('Montserrat');
    });

    it('unicode-range is preserved so glyph coverage is unchanged', () => {
        const css = read('src/index.css');
        expect(css).toContain('unicode-range:');
        expect(css).toContain('U+0000-00FF');   // latin
        expect(css).toContain('U+0100-02BA');   // latin-ext
    });
});

describe('QA-C-008: landmark structure', () => {
    it('the sign-in page wraps its content in a main landmark', () => {
        const src = read('src/pages/AuthPage.jsx');
        expect(src).toContain('<motion.main');
        expect(src).toContain('</motion.main>');
    });

    it('the decorative backdrop on /login is hidden from assistive tech', () => {
        const src = read('src/pages/AuthPage.jsx');
        const idx = src.indexOf('fixed inset-0 z-0 pointer-events-none');
        expect(idx).toBeGreaterThan(-1);
        // aria-hidden must be on that same element, not merely somewhere in the file.
        const tagEnd = src.indexOf('>', idx);
        expect(src.slice(idx, tagEnd)).toContain('aria-hidden');
    });

    it('the chat transcript is a main landmark and announces streamed replies', () => {
        const src = read('src/components/Chat/ChatContainer.jsx');
        expect(src).toContain('<main');
        expect(src).toContain('</main>');
        expect(src).toContain('aria-live="polite"');
        expect(src).toContain('aria-label="Conversation"');
    });

    it('there is exactly one main landmark per screen', () => {
        // Comments must be stripped first. Both files explain the fix in prose that
        // contains the literal text "<main>", and counting that made this test report 2
        // landmarks where the JSX declares 1 — a false failure, not a real one.
        const stripComments = (s) => s
            .replace(/\/\*[\s\S]*?\*\//g, '')   // /* ... */ and JSX {/* ... */}
            .replace(/^\s*\/\/.*$/gm, '');      // // ...
        for (const f of ['src/pages/AuthPage.jsx', 'src/components/Chat/ChatContainer.jsx']) {
            const src = stripComments(read(f));
            const plain = (src.match(/(?<![.\w/])<main[\s>]/g) || []).length;
            const motion = (src.match(/<motion\.main[\s>]/g) || []).length;
            const opens = plain + motion;
            expect(opens, `${f} should declare one main landmark, found ${opens}`).toBe(1);
        }
    });
});

describe('QA-C-011 / PERF-F-017: heavy vendors are not preloaded on first paint', () => {
    const cfg = read('vite.config.js');

    it('modulePreload filters the view-only vendor chunks', () => {
        expect(cfg).toContain('modulePreload');
        expect(cfg).toContain('resolveDependencies');
        expect(cfg).toMatch(/chart-vendor\|markdown-vendor|markdown-vendor\|chart-vendor/);
    });

    it('the chunks are still DECLARED, only their preload is dropped', () => {
        // Deleting the manualChunks entries would inline 754 KB into the main bundle —
        // strictly worse than preloading them. The fix is preload-only.
        expect(cfg).toContain("'chart-vendor'");
        expect(cfg).toContain("'markdown-vendor'");
    });

    it('the chunks the shell genuinely needs are still preloaded', () => {
        // react-vendor and motion-vendor are used by the sign-in screen itself, so
        // filtering those too would trade one waterfall for another.
        const filter = cfg.slice(cfg.indexOf('resolveDependencies'), cfg.indexOf('chunkSizeWarningLimit'));
        expect(filter).not.toContain('react-vendor');
        expect(filter).not.toContain('motion-vendor');
    });
});
