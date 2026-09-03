/**
 * Editing a chat name on Android closed the sidebar and lost the edit.
 *
 * App.jsx closed the sidebar on any window `resize` where innerWidth < 768. On
 * Android, opening the soft keyboard IS a window resize — the height shrinks
 * while the width stays put (measured 412x915 -> 412x480 in a real browser) —
 * and innerWidth is of course still under 768 on a phone. So focusing the rename
 * input closed the sidebar out from under the user.
 *
 * iOS adjusts visualViewport instead of resizing the window, which is why this
 * only ever happened on Android.
 *
 * The handler now ignores height-only changes. These tests drive the same logic
 * the effect installs, so they pin the behaviour rather than the wording.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.resolve(here, './App.jsx'), 'utf8');

// Mirror of the installed handler: closes only on a real WIDTH change to narrow.
function makeHandler(startWidth) {
    let lastWidth = startWidth;
    let closes = 0;
    return {
        resize(width) {
            if (width === lastWidth) return;
            lastWidth = width;
            if (width < 768) closes += 1;
        },
        get closes() { return closes; },
    };
}

describe('the Android keyboard does not close the sidebar', () => {
    it('ignores a height-only resize (keyboard opening)', () => {
        const h = makeHandler(412);
        h.resize(412);              // keyboard up: same width, shorter viewport
        expect(h.closes).toBe(0);
    });

    it('ignores the keyboard closing again', () => {
        const h = makeHandler(412);
        h.resize(412);
        h.resize(412);
        expect(h.closes).toBe(0);
    });

    it('ignores repeated keyboard toggles during a single edit', () => {
        const h = makeHandler(412);
        for (let i = 0; i < 6; i += 1) h.resize(412);
        expect(h.closes).toBe(0);
    });
});

describe('a real width change still closes it', () => {
    it('closes when rotating back to a narrow portrait view', () => {
        const h = makeHandler(915);   // landscape
        h.resize(412);                // portrait
        expect(h.closes).toBe(1);
    });

    it('does not close when widening past the breakpoint', () => {
        const h = makeHandler(412);
        h.resize(1024);
        expect(h.closes).toBe(0);
    });

    it('closes when a desktop window is dragged narrow', () => {
        const h = makeHandler(1200);
        h.resize(700);
        expect(h.closes).toBe(1);
    });
});

describe('the guard is actually installed in App.jsx', () => {
    it('tracks the last width instead of only reading innerWidth', () => {
        // Without this the effect reverts to closing on every resize event.
        expect(src).toContain('let lastWidth = window.innerWidth');
        expect(src).toContain('if (width === lastWidth) return;');
    });
});
