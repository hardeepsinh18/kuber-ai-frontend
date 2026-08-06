/**
 * "shoukd i buy tata" produced a generic non-answer instead of the buy/sell
 * verdict view (and so never asked the short-term/long-term follow-up), because
 * the intent matcher required "should" spelled exactly. A single slipped key is
 * one of the most common ways this exact question gets typed.
 *
 * The modal is now matched loosely; the VERB list stays strict. That asymmetry is
 * the point: "buy"/"sell"/"invest" are short and unambiguous, so loosening them
 * would start swallowing unrelated queries — which on a financial surface is far
 * worse than missing a typo, since it would answer a screener question with a
 * buy/sell verdict.
 *
 * These test the regex pair as written in ChatContainer, kept in sync by reading
 * it from the source rather than being retyped here.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.resolve(here, 'ChatContainer.jsx'), 'utf8');

// Pull the live patterns out of the component so this cannot drift from it.
const modal = src.match(/const MODAL = '([^']+)'/)?.[1];
const verb = src.match(/const VERB = '([^']+)'/)?.[1];

const isVerdict = (q) => {
    const primary = new RegExp(`\\b${modal}\\s+(?:i|we|you)\\s+${verb}\\b`, 'i');
    const secondary = /worth (buying|investing|it)|good (buy|investment)|buy or sell|\bgood stock\b/i;
    return primary.test(q) || secondary.test(q);
};

describe('verdict intent survives a typo in the modal', () => {
    it('extracted the patterns from the component', () => {
        expect(modal, 'MODAL not found in ChatContainer.jsx').toBeTruthy();
        expect(verb, 'VERB not found in ChatContainer.jsx').toBeTruthy();
    });

    it('matches the correctly spelled question', () => {
        expect(isVerdict('should i buy tata')).toBe(true);
    });

    it('matches the reported typo', () => {
        expect(isVerdict('shoukd i buy tata')).toBe(true);
    });

    it('matches other common one-key slips on "should"', () => {
        for (const q of [
            'shold i buy tata',
            'shoud i buy tata',
            'sould i buy tata',
            'shuld i buy tata',
            'shoudl i buy tata',
        ]) {
            expect(isVerdict(q), q).toBe(true);
        }
    });

    it('matches the other modals that mean the same thing', () => {
        for (const q of [
            'can i buy tata',
            'shall i sell tcs',
            'could i invest in infy',
            'must i sell hdfc',
        ]) {
            expect(isVerdict(q), q).toBe(true);
        }
    });

    it('matches we/you as well as i', () => {
        expect(isVerdict('should we invest in tcs')).toBe(true);
    });

    it('still matches the non-modal phrasings', () => {
        for (const q of [
            'is tata a good buy',
            'is tcs worth buying',
            'tata buy or sell',
        ]) {
            expect(isVerdict(q), q).toBe(true);
        }
    });
});

describe('verdict intent does not swallow unrelated queries', () => {
    it('leaves screener, metric and price queries alone', () => {
        for (const q of [
            'show me tcs fundamentals',
            'top psu stocks by dividend yield',
            'highest pe ratio in it sector',
            'what is a p/e ratio',
            'sonata software price',
            'how has nifty performed this year',
            'tata steel chart',
        ]) {
            expect(isVerdict(q), q).toBe(false);
        }
    });

    it('does not fire on "buy" appearing in unrelated prose', () => {
        // The modal+pronoun+verb shape is what makes this safe: a bare "buy"
        // anywhere in the sentence must not trigger a verdict view.
        expect(isVerdict('buy side analysts like tcs')).toBe(false);
        expect(isVerdict('which stocks did fii buy last month')).toBe(false);
    });
});
