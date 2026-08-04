/**
 * The splash plays on EVERY load, including reloads and second tabs.
 *
 * History: QA-C-001 gated it to once per browser session so a returning user did
 * not spend 2.2s of time-to-interactive on a brand moment with no informational
 * payload. That was reverted deliberately (product call, 2026-08-04).
 *
 * What these tests pin, and why this file is shaped this way:
 *
 * The previous version of this suite asserted only against the storage helpers
 * (hasSeenSplashThisSession / markSplashSeen). That turned out not to test the
 * behaviour at all — the helpers still behave exactly as they did, so every one
 * of those assertions passed unchanged after the gate was removed. A test that
 * cannot fail when the feature flips is not protecting the feature.
 *
 * So the first test here reads the ACTUAL gate: the `useState` initial value in
 * App that decides whether <SplashScreen> renders. That is the line that
 * regressed before and the line that would regress again. The helper tests are
 * kept below because the helpers are still exported and still must never throw,
 * but they are explicitly NOT the contract for whether the splash shows.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    SPLASH_SEEN_KEY as KEY,
    hasSeenSplashThisSession,
    markSplashSeen,
} from './App.jsx';

// Resolved from this file's own module id rather than import.meta.url or
// process.cwd(): under the jsdom environment import.meta.url is an http:// URL
// (fileURLToPath rejects it), and `process` is not in the shared lint config's
// browser globals. Vite rewrites import.meta.filename to the real path on disk.
const readAppSource = () =>
    readFileSync(resolve(import.meta.dirname, 'App.jsx'), 'utf8');

describe('splash shows on every load', () => {
    beforeEach(() => {
        try { sessionStorage.clear(); } catch { /* ignore */ }
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    /**
     * Mounting App pulls in Cognito, the router and every provider, which is why
     * this suite has never rendered it. Asserting on the source of the one
     * decisive line keeps that constraint while still failing if the session gate
     * is reintroduced — which assertions against the helpers alone did not.
     */
    it('does not seed splashDone from session storage', () => {
        const src = readAppSource();
        const gate = src.match(/const \[splashDone, setSplashDone\] = useState\(([^)]*)\)/);

        expect(gate, 'the splashDone useState declaration should exist in App.jsx').not.toBeNull();
        // `useState(false)` → always renders the splash. Seeding it from
        // hasSeenSplashThisSession is exactly the behaviour that was reverted.
        expect(gate[1].trim()).toBe('false');
        expect(gate[1]).not.toContain('hasSeenSplash');
    });

    it('still renders the splash even after it has been marked seen', () => {
        markSplashSeen();
        const src = readAppSource();
        // The render is gated on splashDone alone — no storage read in the JSX.
        expect(src).toContain('{!splashDone && <SplashScreen');
    });
});

/**
 * The helpers survive the revert: they are the seam for restoring a gate, and
 * they must degrade rather than throw. sessionStorage raises in Safari private
 * mode and when storage is disabled, and an exception here would take down the
 * whole app at startup.
 *
 * These assert the helpers in isolation. They deliberately say nothing about
 * whether the splash renders — see the suite above for that.
 */
describe('splash storage helpers', () => {
    beforeEach(() => {
        try { sessionStorage.clear(); } catch { /* ignore */ }
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('reports false before the splash has been marked seen', () => {
        expect(hasSeenSplashThisSession()).toBe(false);
    });

    it('reports true once marked seen', () => {
        markSplashSeen();
        expect(hasSeenSplashThisSession()).toBe(true);
    });

    it('records to sessionStorage, not localStorage', () => {
        markSplashSeen();
        expect(localStorage.getItem(KEY)).toBeNull();
        expect(sessionStorage.getItem(KEY)).toBe('1');
    });

    it('returns false rather than throwing when storage reads throw', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError: storage disabled');
        });
        expect(hasSeenSplashThisSession()).toBe(false);
    });

    it('does not crash when storage writes throw', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        expect(() => markSplashSeen()).not.toThrow();
    });
});
