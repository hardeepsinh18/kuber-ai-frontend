/**
 * Two mobile problems with the chat-history rows.
 *
 * 1. The row JUMPED when the inline rename opened: the edit view used py-0.5
 *    against the normal row's py-1.5, so the row lost ~3px and shifted under the
 *    user's finger mid-tap. Measured in a real browser before the fix.
 *
 * 2. The rename and delete icons were 18px squares 2px apart — far under the
 *    ~44px touch guidance, and close enough that a thumb regularly hit the wrong
 *    one. The wrong one here is destructive, which is what makes it worth
 *    fixing rather than merely tidying.
 *
 * Touch gets padding and separation; desktop keeps the compact spacing it had,
 * since a mouse has no trouble with either.
 *
 * Asserted against source: the sidebar needs auth/router/theme providers and a
 * populated chat list to mount, and what is under test is the class contract.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.resolve(here, './Sidebar.jsx'), 'utf8');

describe('the row does not move when renaming starts', () => {
    it('the edit view no longer uses the shorter padding', () => {
        expect(src).not.toContain('flex-1 flex items-center gap-1 px-1.5 py-0.5');
    });

    it('the edit view padding is the one that keeps the row height', () => {
        expect(src).toContain('flex-1 flex items-center gap-1 px-1.5 py-1');
    });
});

describe('touch targets are usable on a phone', () => {
    it('rename and delete get a larger hit area on touch, compact on desktop', () => {
        // p-2 (~26px box) below md:, p-1 at md: and up.
        const touchPadded = src.match(/className="p-2 md:p-1 rounded-md/g) || [];
        expect(touchPadded.length).toBeGreaterThanOrEqual(1);
        expect(src).toContain('p-2 md:p-1 rounded-md transition-all');
    });

    it('the two icons are separated on touch', () => {
        // 2px of gap put the destructive action right next to the safe one.
        expect(src).toContain('gap-1.5 md:gap-0.5');
    });

    it('desktop spacing is unchanged', () => {
        // The md: half of each pair must still be the original value, so this
        // is purely additive for mouse users.
        expect(src).toMatch(/gap-1\.5 md:gap-0\.5/);
        expect(src).toMatch(/p-2 md:p-1/);
    });

    it('both actions still carry an accessible name', () => {
        expect(src).toContain('aria-label="Rename chat"');
        expect(src).toContain('aria-label="Delete chat"');
    });
});
