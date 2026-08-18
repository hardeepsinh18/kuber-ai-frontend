/**
 * The collapsed icon strip rendered its own theme toggle unconditionally.
 *
 * Two problems with that. Signed in, the ProfileMenu directly below it already
 * carries a Theme row (it takes `toggleTheme` in BOTH variants), so the strip
 * held a second, duplicate control for the same setting. And visually it was a
 * wide 40x22 pill sitting among otherwise square ~36px icon buttons, so once the
 * sidebar collapsed it read as a stray element that had been left behind.
 *
 * It is not removed outright: signed out there is no ProfileMenu in the strip —
 * just a LogIn button or a static "G" avatar — so the toggle is the only way to
 * change theme. The expanded footer already solves this exact case the same way,
 * rendering a standalone toggle only when signed out.
 *
 * Asserted against the SOURCE rather than a render because the component needs
 * auth + router + theme providers to mount, and the thing under test is the
 * render condition itself.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.resolve(here, './Sidebar.jsx'), 'utf8');

// The collapsed strip starts at its marker comment and runs to end of file.
const collapsed = src.slice(src.indexOf('COLLAPSED ICON STRIP'));

describe('collapsed sidebar theme toggle', () => {
    it('found the collapsed icon strip', () => {
        expect(collapsed.length).toBeGreaterThan(0);
        expect(collapsed).toContain('toggleTheme');
    });

    it('is gated so it does not duplicate the account menu', () => {
        expect(collapsed).toContain('{!(supabaseConfigured && isAuthenticated && user) && (');
    });

    it('the gate is the exact inverse of the ProfileMenu condition', () => {
        // ProfileMenu (which owns the Theme row when signed in) renders on
        // `supabaseConfigured ? isAuthenticated && user : …` — so the standalone
        // toggle must appear only when that is false, or the two overlap again.
        expect(collapsed).toContain('supabaseConfigured ?');
        expect(collapsed).toContain('isAuthenticated && user ? (');
    });

    it('still renders the toggle for the signed-out case', () => {
        // A bare removal would strip theme access for guests, who get no
        // ProfileMenu in the strip.
        const gateAt = collapsed.indexOf('{!(supabaseConfigured && isAuthenticated && user) && (');
        const buttonAt = collapsed.indexOf('onClick={toggleTheme}', gateAt);
        expect(gateAt).toBeGreaterThan(-1);
        expect(buttonAt).toBeGreaterThan(gateAt);
    });

    it('the toggle carries an accessible label', () => {
        const gateAt = collapsed.indexOf('{!(supabaseConfigured && isAuthenticated && user) && (');
        const slice = collapsed.slice(gateAt, gateAt + 700);
        expect(slice).toContain('aria-label="Toggle theme"');
    });
});
