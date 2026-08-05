import { describe, it, expect } from 'vitest';
import { getScores } from './answerKit.jsx';

describe('getScores — fundamental score is 0-100, never rescaled', () => {
    it('keeps a low v4 fundamental score as-is (regression: 5 must not become 50)', () => {
        const { fundamental } = getScores({ fundamental: { score: 5 } }, null);
        expect(fundamental).toBe(5);
    });

    it('keeps a single-digit score as-is (8 stays 8, not 80)', () => {
        const { fundamental } = getScores({ fundamental: { score: 8 } }, null);
        expect(fundamental).toBe(8);
    });

    it('passes a normal 0-100 score through unchanged', () => {
        const { fundamental } = getScores({ fundamental: { score: 83 } }, null);
        expect(fundamental).toBe(83);
    });

    it('prefers overall.components.financial when present', () => {
        const { fundamental } = getScores(
            { overall: { components: { financial: 71 } }, fundamental: { score: 40 } },
            null,
        );
        expect(fundamental).toBe(71);
    });

    it('returns null when there is no fundamental score', () => {
        const { fundamental } = getScores({ technical: { score: 60 } }, null);
        expect(fundamental).toBeNull();
    });
});
