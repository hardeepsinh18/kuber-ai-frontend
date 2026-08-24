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
 * Two earlier attempts bracketed the answer. An amber OUTLINE on every row still
 * read as ten yellow controls stacked down the panel; removing the container
 * entirely made the label read as a caption rather than something clickable. The
 * resting state is therefore a NEUTRAL button surface — zinc border plus a faint
 * fill — which reads as a control without competing with the signal badges.
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

describe('the drawer does not leak a page scrollbar', () => {
    it('locks both axes while open', () => {
        // The drawer is fixed-position and sits above the page, so a horizontal
        // page scrollbar renders as a stray bar across the bottom of the sheet.
        expect(src).toContain("document.body.style.overflowX = 'hidden'");
        expect(src).toContain("document.body.style.overflow = 'hidden'");
    });

    it('restores both axes on unmount', () => {
        // Leaving overflow pinned would freeze the page after the drawer closes.
        expect(src).toContain('document.body.style.overflow = prevY');
        expect(src).toContain('document.body.style.overflowX = prevX');
    });

    it('applies at every breakpoint, not just mobile', () => {
        // The old guard bailed out at >=768px, which is exactly where the
        // reported stray scrollbar appeared (a narrow desktop window).
        expect(src).not.toContain('window.innerWidth >= 768');
    });

    it('keeps the footer pinned rather than scrolling with the list', () => {
        expect(src).toContain('px-4 py-3 flex-shrink-0');
    });
});

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
    it('looks like a button at rest, in neutral zinc', () => {
        // It must READ as clickable — bare text looked like a caption.
        expect(analyzeBlock).toContain('border border-zinc-300 dark:border-zinc-700');
        expect(analyzeBlock).toContain('bg-zinc-100 dark:bg-white/[0.04]');
    });

    it('uses no brand yellow at rest', () => {
        // Ten amber rows is what made the panel look "too yellow". The hover:
        // and focus-visible: prefixed forms are exactly what we DO want, so
        // match only a bare (unprefixed) occurrence.
        expect(analyzeBlock).not.toMatch(/(?<!:)bg-\[#FDD405\]/);
        expect(analyzeBlock).not.toMatch(/(?<!:)border-\[#FDD405\]/);
    });

    it('fills with brand yellow on hover', () => {
        expect(analyzeBlock).toContain('hover:bg-[#FDD405]');
        expect(analyzeBlock).toContain('hover:text-black');
    });

    it('lights up when the ROW is hovered, not only the button', () => {
        // The button is a small target at the far right of a wide row. Hovering
        // the stock name should light its action, so group-hover: is what makes
        // the whole row feel like one control (the <tr> carries `group`).
        expect(analyzeBlock).toContain('group-hover:bg-[#FDD405]');
        expect(analyzeBlock).toContain('group-hover:text-black');
        expect(src).toContain('className="group"');
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
