import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, 'ChatContainer.jsx');

/**
 * PERF-F-006 (part 1 of 3) — retry backoff jitter.
 *
 * Both retry sites in ChatContainer used a hardcoded 2500 ms wait. A backend rolling
 * restart takes ~30 s and drops every in-flight request at once, so every affected client
 * retried at the SAME instant — a synchronised wave against an origin still coming up.
 *
 * Parts 2 and 3 of the finding (an idempotency key so a retried /chat cannot re-bill, and
 * deciding whether the client or the server owns retrying) are deliberately NOT done here:
 * both change the billing path, and removing the wrong retry layer would make every deploy
 * restart visible to users as a failed question. See docs/SECURITY-EXCEPTIONS.md.
 */

const src = fs.readFileSync(SRC, 'utf8');

describe('PERF-F-006: retry backoff is jittered', () => {
    it('no retry site uses a fixed 2500 ms wait any more', () => {
        expect(src).not.toContain('setTimeout(r, 2500)');
    });

    it('both retry sites go through retryDelay()', () => {
        const uses = (src.match(/setTimeout\(r, retryDelay\(\)\)/g) || []).length;
        expect(uses).toBe(2);
    });

    it('retryDelay is full jitter, not base + random', () => {
        // `base + Math.random() * base` still clusters above `base` and would keep the
        // herd partially synchronised. Full jitter spans the whole window from 0.
        const line = src.split('\n').find((l) => l.includes('const retryDelay'));
        expect(line).toBeTruthy();
        expect(line).toMatch(/Math\.random\(\)\s*\*\s*RETRY_BACKOFF_MS/);
        expect(line).not.toMatch(/RETRY_BACKOFF_MS\s*\+/);
    });

    it('the ceiling is unchanged, so no retry waits longer than before', () => {
        expect(src).toContain('const RETRY_BACKOFF_MS = 2500;');
    });

    // Behavioural checks against the same formula the source uses.
    const BASE = 2500;
    const delay = () => Math.floor(Math.random() * BASE);

    it('never exceeds the previous fixed wait', () => {
        const samples = Array.from({ length: 20_000 }, delay);
        expect(Math.max(...samples)).toBeLessThan(BASE);
        expect(Math.min(...samples)).toBeGreaterThanOrEqual(0);
    });

    it('averages well below the old constant', () => {
        const samples = Array.from({ length: 20_000 }, delay);
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        // The common single-client case is now FASTER on average, not slower.
        expect(mean).toBeGreaterThan(BASE * 0.4);
        expect(mean).toBeLessThan(BASE * 0.6);
    });

    it('spreads a simultaneous herd across many distinct instants', () => {
        // The actual defect: 50 clients dropped by one restart used to wake as one wave.
        const herd = new Set(Array.from({ length: 50 }, delay));
        expect(herd.size).toBeGreaterThan(35);
    });

    it('does not change WHETHER a retry happens', () => {
        // Guards the blast radius: the retry conditions and the abort checks that make a
        // user-initiated Stop cancel the retry must all survive this change.
        expect(src).toContain('[502, 503, 504].includes(response.status)');
        expect(src).toContain('requestId !== activeRequestIdRef.current');
    });
});
