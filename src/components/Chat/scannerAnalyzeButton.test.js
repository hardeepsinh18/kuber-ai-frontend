/**
 * The scanner's per-row "Analyze" button was hover-gated on desktop
 * (md:opacity-0 + md:group-hover:opacity-100), so a ten-row result showed at
 * most ONE button at a time and every other row looked action-less. The action
 * was discoverable only by chance — whichever row the pointer happened to cross.
 *
 * Now every row shows it, styled to match the chart-type tabs in StockChart.jsx
 * — the same problem solved there: many peer controls where at most one is
 * emphasised. Idle is PLAIN (no border, muted text); brand yellow is reserved
 * for the row actually under the pointer.
 *
 * An earlier attempt gave every row an amber OUTLINE. That still read as ten
 * yellow controls stacked down the panel, so the border was dropped entirely
 * rather than merely softened.
 *
 * Asserted against source: the drawer needs theme/router context and a live
 * scan payload to mount, and what is under test is the class contract.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.resolve(here, './ScannerDrawer.jsx'), 'utf8');

// The Analyze button and the classes immediately around it.
const analyzeBlock = (() => {
    const at = src.indexOf('onClick={() => onAnalyze(sym)}');
    return src.slice(at, src.indexOf('</button>', at));
})();

describe('scanner Analyze button is always visible', () => {
    it('found the button', () => {
        expect(analyzeBlock.length).toBeGreaterThan(0);
    });

    it('is not hidden behind a hover gate any more', () => {
        expect(analyzeBlock).not.toContain('md:opacity-0');
        expect(analyzeBlock).not.toContain('md:group-hover:opacity-100');
    });

    it('has no opacity gating at all', () => {
        // A leftover opacity-0 on any breakpoint reintroduces the same bug.
        expect(analyzeBlock).not.toMatch(/opacity-0/);
    });
});

describe('it is plain when idle and yellow only on hover', () => {
    it('carries no border or fill at rest', () => {
        // The whole point: ten rows of chrome is what made the panel look
        // "too yellow". Idle must be text only.
        expect(analyzeBlock).not.toContain('border-[#FDD405]');
        // Unprefixed bg-[#FDD405] would paint every row yellow; the hover: and
        // focus-visible: prefixed forms are exactly what we DO want, so match
        // only a bare occurrence (not preceded by ':').
        expect(analyzeBlock).not.toMatch(/(?<!:)bg-\[#FDD405\]/);
        expect(analyzeBlock).toContain('text-zinc-600 dark:text-zinc-400');
    });

    it('fills with brand yellow on hover', () => {
        expect(analyzeBlock).toContain('hover:bg-[#FDD405]');
        expect(analyzeBlock).toContain('hover:text-black');
    });

    it('does the same on keyboard focus, not just pointer hover', () => {
        // Hover-only styling leaves keyboard users with no visible affordance.
        expect(analyzeBlock).toContain('focus-visible:bg-[#FDD405]');
        expect(analyzeBlock).toContain('focus-visible:text-black');
    });

    it('matches the chart-type tabs it was modelled on', () => {
        // If StockChart's selected-tab treatment changes, these should be
        // reviewed together rather than drifting into two different looks.
        const chart = fs.readFileSync(path.resolve(here, './StockChart.jsx'), 'utf8');
        expect(chart).toContain("'bg-[#FDD405] text-black font-semibold'");
        expect(analyzeBlock).toContain('hover:font-semibold');
        expect(analyzeBlock).toContain('transition-all');
    });
});
