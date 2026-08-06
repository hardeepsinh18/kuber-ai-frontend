import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, 'ChatContainer.jsx');
const DROPDOWN = path.resolve(here, 'ClarifyDropdown.jsx');

/**
 * Group-disambiguation picker.
 *
 * History matters here, because the placement has now moved twice:
 *
 * 1. It began as an `absolute bottom-full` overlay with NO height cap. A
 *    six-company group (Tata) is ~440px tall, which is taller than the gap above
 *    the composer on a laptop, so it drew over both the answer text and the input
 *    box.
 * 2. That was fixed by moving it inline into the message list.
 * 3. It has since moved back to the composer (product decision, 2026-08-06): the
 *    answer to a clarifying question is the user's next input, so the choice
 *    belongs where they are about to type — and both clarifying prompts (company
 *    picker, time-horizon picker) now share one ClarifyDropdown component instead
 *    of looking like two different features.
 *
 * These tests therefore pin the PROPERTY that defect 1 was about — the picker
 * must not be able to grow off-screen — rather than the placement itself, which
 * is a design choice that has legitimately changed. Pinning the placement is what
 * made this suite fail on an intended change.
 *
 * Defect 2 (wrong message owning the payload) is unrelated to placement and is
 * still pinned exactly as before.
 */

const src = fs.readFileSync(SRC, 'utf8');
const dropdown = fs.readFileSync(DROPDOWN, 'utf8');

describe('clarification picker cannot cover the transcript', () => {
    it('caps its own height so a long group scrolls instead of overflowing', () => {
        // The actual regression guard: without this, six companies push the top of
        // the panel off-screen (measured at top:-163 on a 420px-tall viewport).
        expect(dropdown).toMatch(/max-h-\[min\(/);
        expect(dropdown).toContain('overflow-y-auto');
    });

    it('contains its own scrolling rather than the page scrolling behind it', () => {
        expect(dropdown).toContain('overscroll-contain');
    });

    it('bounds the number of options it will render', () => {
        expect(dropdown).toContain('options.slice(0, 9)');
    });
});

describe('one component serves both clarifying questions', () => {
    it('the composer feeds it both the company and the horizon choices', () => {
        expect(src).toContain('companyChoices');
        expect(src).toContain('horizonQuestion');
    });

    it('sends the ticker, not the display name', () => {
        // The LLM collapses long successor names back to the ambiguous parent,
        // which re-triggers the very question the user just answered.
        expect(src).toMatch(/ticker\s*\|\|\s*c\.name/);
    });
});

describe('activeClarificationId resolves the message that owns the payload', () => {
    it('looks the target up by freshDisambigId instead of assuming it is last', () => {
        expect(src).toContain('messages.find(m => m.id === freshDisambigId && m.role === \'ai\')');
    });

    it('still suppresses a dismissed picker', () => {
        expect(src).toContain('dismissedDisambigId === freshDisambigId');
    });

    it('still hides a stale picker once a newer answer has arrived', () => {
        expect(src).toContain('lastAI?.id !== freshDisambigId');
    });
});
