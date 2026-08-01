import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, 'ChatContainer.jsx');
const POPUP = path.resolve(here, 'GroupClarificationPopup.jsx');

/**
 * Group-disambiguation picker placement.
 *
 * Two defects, both visible as the picker covering the transcript:
 *
 * 1. It was an `absolute bottom-full` overlay on the input-bar wrapper, so a
 *    six-company group (Tata) was taller than the gap above the composer and
 *    drew over both the answer text and the input box.
 * 2. `activeClarificationId` resolved to whatever the LAST ai message was and
 *    only then compared it to freshDisambigId. Asking an ambiguous query twice
 *    ("tata", then "tata" again) meant the payload lived on the older message
 *    while the picker keyed to the newer one, rendering it under the wrong
 *    answer and across that answer's Analysis-steps bar.
 */

const src = fs.readFileSync(SRC, 'utf8');
const popup = fs.readFileSync(POPUP, 'utf8');

describe('clarification picker is inline, not an overlay', () => {
    it('does not anchor the picker above the composer any more', () => {
        expect(src).not.toContain('absolute bottom-full inset-x-0 z-40');
    });

    it('renders the picker inside the message list, keyed to its own message', () => {
        expect(src).toContain('msg.role === \'ai\' && msg.id === activeClarificationId');
    });

    it('reads the disambiguation off that same message, not a re-scanned lastAI', () => {
        expect(src).toContain('msg.metadata?.disambiguation?.group_name');
        expect(src).toContain('msg.metadata?.disambiguation?.suggestions');
    });

    it('drops the floating-overlay chrome that caused the overlap', () => {
        expect(popup).not.toContain('backdrop-blur-xl');
        expect(popup).not.toContain('slide-in-from-bottom-2');
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
