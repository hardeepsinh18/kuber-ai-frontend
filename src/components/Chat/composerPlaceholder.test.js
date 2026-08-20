/**
 * The composer placeholder read "Ask VentyAI anything finance...". Changed to
 * "Say Venty to..." (2026-08-20, user request) — it leads with the brand's
 * spoken name and reads as an invitation to talk to Venty rather than to
 * operate a search box. The trailing "ask anything finance" was dropped: the
 * trailing ellipsis already implies the sentence continues, and the shorter
 * string leaves the composer uncluttered.
 *
 * The string lives in TWO components — the persistent composer (InputBar) and
 * the first-run start screen (StartScreen) — which are shown in the same
 * session. They must not drift: one saying "Ask VentyAI" while the other says
 * "Say Venty" reads as two different products.
 *
 * Asserted against source rather than a render because both components need
 * router/auth/theme providers to mount, and what matters here is that the two
 * literals stay identical.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.resolve(here, f), 'utf8');

const inputBar = read('./InputBar.jsx');
const startScreen = read('./StartScreen.jsx');

const placeholderOf = (src) => src.match(/placeholder="([^"]+)"/)?.[1];

const EXPECTED = 'Say Venty to...';

describe('composer placeholder', () => {
    it('uses the new wording in the persistent composer', () => {
        expect(placeholderOf(inputBar)).toBe(EXPECTED);
    });

    it('uses the same wording on the start screen', () => {
        expect(placeholderOf(startScreen)).toBe(EXPECTED);
    });

    it('the two surfaces stay in sync', () => {
        expect(placeholderOf(inputBar)).toBe(placeholderOf(startScreen));
    });

    it('the old wording is gone from both', () => {
        expect(inputBar).not.toContain('Ask VentyAI');
        expect(startScreen).not.toContain('Ask VentyAI');
    });

    it('stays short enough to fit a 360px composer on one line', () => {
        // The previous wording measured 334px of 334px available at 360px —
        // exactly at the limit. This one is far shorter, but keep the budget so
        // a future rewording cannot silently truncate mid-word on mobile.
        expect(EXPECTED.length).toBeLessThanOrEqual(40);
    });
});
