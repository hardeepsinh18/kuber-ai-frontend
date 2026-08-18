import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * SEC-C-004 — /preview is the internal visual test harness. It renders FABRICATED
 * analyst output (invented prices, verdicts, transcript quotes) against REAL NSE
 * tickers, unmarked, and it was publicly reachable at https://aws.72street.ai/preview.
 * Serving invented figures about real listed companies from our own domain is a
 * misleading-financial-content problem.
 *
 * The route is gated on `import.meta.env.DEV`, which is statically false in a production
 * build, so Vite tree-shakes both the route and PreviewPage out of the bundle.
 *
 * These are SOURCE-level assertions on purpose: a bundle assertion would only run after
 * `npm run build` and would silently pass (vacuously) in a normal `vitest run` where
 * dist/ is absent or stale. The build-output claim was verified manually instead — with
 * the guard removed the fingerprint string is present in dist/assets/*.js; with it in
 * place the string is gone.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(here, '..', 'App.jsx');

describe('SEC-C-004: /preview must not ship to production', () => {
    const src = fs.readFileSync(APP, 'utf8');

    it('the route exists (the harness is still usable in dev)', () => {
        expect(src).toContain('path="/preview"');
    });

    it('the route is gated on import.meta.env.DEV', () => {
        // Find the /preview route and look backwards for the guard in the same JSX block.
        const idx = src.indexOf('path="/preview"');
        expect(idx).toBeGreaterThan(-1);
        const before = src.slice(Math.max(0, idx - 900), idx);
        expect(before).toContain('import.meta.env.DEV');
    });

    it('no OTHER route shares the guard by accident', () => {
        // Guards the shape of the fix: the conditional must wrap only /preview, not
        // swallow /login, which must stay public.
        for (const route of ['path="/login"']) {
            const i = src.indexOf(route);
            expect(i, `${route} disappeared`).toBeGreaterThan(-1);
            const line = src.slice(src.lastIndexOf('\n', i) + 1, src.indexOf('\n', i));
            expect(line).not.toContain('import.meta.env.DEV');
        }
    });

    it('the catch-all app route is still unconditional', () => {
        const i = src.indexOf('path="/*"');
        expect(i).toBeGreaterThan(-1);
        const line = src.slice(src.lastIndexOf('\n', i) + 1, src.indexOf('\n', i));
        expect(line).not.toContain('import.meta.env.DEV');
    });
});
