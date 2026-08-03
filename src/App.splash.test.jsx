/**
 * QA-C-001 — the splash is a first-visit-per-session moment, not a toll booth.
 *
 * It used to gate the router for a fixed 2.2s on EVERY load: every reload, every
 * second tab, every return visit, with no informational payload after the first
 * time. That is dead time-to-interactive for a returning user.
 *
 * These tests pin the three properties that matter:
 *   1. a genuinely new session still sees it (the brand moment is preserved),
 *   2. a repeat load in the same session does NOT,
 *   3. storage being unavailable (Safari private mode) degrades to showing it,
 *      never to a crash.
 *
 * Asserted against the module's own exported helpers rather than a full App
 * render, since mounting App pulls in Cognito, the router and every provider.
 * These are the real functions App uses — not a copy — so the test cannot drift
 * away from the implementation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    SPLASH_SEEN_KEY as KEY,
    hasSeenSplashThisSession,
    markSplashSeen,
} from './App.jsx';

describe('QA-C-001 splash gating', () => {
    beforeEach(() => {
        try { sessionStorage.clear(); } catch { /* ignore */ }
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('shows the splash on a fresh session', () => {
        expect(hasSeenSplashThisSession()).toBe(false);
    });

    it('skips the splash after it has been seen once', () => {
        markSplashSeen();
        expect(hasSeenSplashThisSession()).toBe(true);
    });

    it('persists across a reload within the same session', () => {
        markSplashSeen();
        // A reload re-runs the initialiser against the same sessionStorage.
        expect(hasSeenSplashThisSession()).toBe(true);
    });

    it('shows again in a new session (sessionStorage cleared, not localStorage)', () => {
        markSplashSeen();
        sessionStorage.clear();           // what a new browser session looks like
        expect(hasSeenSplashThisSession()).toBe(false);
    });

    it('does not use localStorage — the brand moment must survive a new session', () => {
        markSplashSeen();
        expect(localStorage.getItem(KEY)).toBeNull();
    });

    it('falls back to showing the splash when storage reads throw', () => {
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
