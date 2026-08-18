/**
 * The start-screen chips are the first thing a new user clicks, so each one has
 * to actually reach the surface its tag promises.
 *
 * The "Verdict" chip read "Is Reliance a good buy right now?". That phrasing
 * works, but it is not how the product asks the question anywhere else — the
 * verdict detector's primary pattern is "should I buy X", and the typo-tolerance
 * work (shoukd/shold/shuld) was all built around that shape. A starter chip is
 * teaching the user how to talk to the product, so it should model the canonical
 * phrasing rather than an alternative the regex happens to also catch.
 *
 * These assert routing, not wording, so rephrasing a chip is free as long as it
 * still lands on the right surface.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractQueryIntent } from '../../lib/queryIntent';

const here = path.dirname(fileURLToPath(import.meta.url));

const readQueries = (file, re) => {
    const src = fs.readFileSync(path.resolve(here, file), 'utf8');
    return [...src.matchAll(re)].map((m) => m[1]);
};

// StartScreen: { tag: '…', Icon: …, q: 'the query', short: '…' }
const startScreenQueries = readQueries('./StartScreen.jsx', /\bq:\s*'([^']+)'/g);
// InputBar: a flat array of rotating placeholder strings.
const inputBarSrc = fs.readFileSync(path.resolve(here, './InputBar.jsx'), 'utf8');
const inputBarBlock = inputBarSrc.match(/const QUERIES = \[([\s\S]*?)\]/)?.[1] ?? '';
const inputBarQueries = [...inputBarBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]);

describe('start-screen starter chips', () => {
    it('found the query list in the source', () => {
        expect(startScreenQueries.length).toBe(6);
    });

    it('the Verdict chip asks the canonical "should I buy" question', () => {
        const verdictChip = startScreenQueries.find((q) => /buy/i.test(q));
        expect(verdictChip).toBe('Should I buy Reliance?');
    });

    it('the Verdict chip actually routes to the verdict surface', () => {
        // The point of the chip: it must produce a verdict answer, not a generic
        // one. Wording may change; this must not.
        expect(extractQueryIntent('Should I buy Reliance?')).toBe('verdict');
    });

    it('no chip still uses the old phrasing', () => {
        for (const q of [...startScreenQueries, ...inputBarQueries]) {
            expect(q).not.toMatch(/good buy right now/i);
        }
    });
});

describe('the composer placeholders match the start-screen chips', () => {
    it('found both lists', () => {
        expect(inputBarQueries.length).toBe(6);
    });

    it('the two lists stay in sync', () => {
        // They are shown in the same session — the placeholder rotating a
        // question the chips no longer offer reads as a stale second copy.
        expect(inputBarQueries).toEqual(startScreenQueries);
    });
});
