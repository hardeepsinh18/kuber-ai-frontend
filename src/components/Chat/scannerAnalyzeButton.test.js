/**
 * The scanner's per-row "Analyze" button was hover-gated on desktop
 * (md:opacity-0 + md:group-hover:opacity-100), so a ten-row result showed at
 * most ONE button at a time and every other row looked action-less. The action
 * was discoverable only by chance — whichever row the pointer happened to cross.
 *
 * Now every row shows it. Resting state is a quiet amber OUTLINE rather than the
 * previous solid fill: ten filled brand-yellow buttons would fight the signal
 * badges for attention and turn the panel into a wall of yellow. Hover (and
 * keyboard focus) fills it in, so the row under the pointer is still the
 * emphasised one — which is the behaviour the user asked for.
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

describe('it turns brand yellow on hover', () => {
    it('rests as an outline, not a solid fill', () => {
        expect(analyzeBlock).toContain('bg-transparent');
        expect(analyzeBlock).toContain('border-[#FDD405]/50');
    });

    it('fills with brand yellow on hover', () => {
        expect(analyzeBlock).toContain('hover:bg-[#FDD405]');
        expect(analyzeBlock).toContain('hover:text-zinc-900');
    });

    it('does the same on keyboard focus, not just pointer hover', () => {
        // Hover-only styling leaves keyboard users with no visible affordance.
        expect(analyzeBlock).toContain('focus-visible:bg-[#FDD405]');
        expect(analyzeBlock).toContain('focus-visible:ring-2');
    });

    it('animates the colour, so the fill is not an abrupt swap', () => {
        expect(analyzeBlock).toContain('transition-colors');
    });
});
