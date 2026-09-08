import { describe, it, expect } from 'vitest';
import { errorCopy } from '../../data/errorMessages';

/**
 * Guards the error-routing contract in ChatContainer's catch block.
 *
 * The block used to decide what to show by regex-matching the message text, so
 * changing a word could silently demote a specific message to the generic one.
 * Routing is now by `err.ventyCode`. These tests encode that logic directly —
 * mounting ChatContainer needs auth/router/history context and would test the
 * harness more than the rule.
 */

/** Mirrors the catch block: code wins, network heuristic second, generic last. */
const resolve = (err) => {
    if (err.ventyCode) return err.message || errorCopy(err.ventyCode).message;
    if (err.message && /network|fetch|failed to fetch|load failed|networkerror/i.test(err.message)) {
        return errorCopy('SERVER_ERROR').message;
    }
    return errorCopy('GENERIC').message;
};

const tagged = (code, message) => Object.assign(new Error(message), { ventyCode: code });

describe('error routing by code', () => {
    it('shows the session message for an expired session', () => {
        const msg = resolve(tagged('SESSION_EXPIRED', errorCopy('SESSION_EXPIRED').message));
        expect(msg).toBe('Your session timed out for safety. Sign in again and carry on.');
    });

    it('shows the signed-out message when there was never a token', () => {
        const msg = resolve(tagged('NOT_LOGGED_IN', errorCopy('NOT_LOGGED_IN').message));
        expect(msg).toContain('You are signed out');
    });

    it('shows our-fault copy for a 5xx', () => {
        const msg = resolve(tagged('SERVER_ERROR', errorCopy('SERVER_ERROR').message));
        expect(msg).toContain('broke on my side, not yours');
    });

    // The regression this whole change exists to prevent.
    it('does not demote tagged copy just because the wording changed', () => {
        // Wording that the OLD regex allowlist would have rejected outright.
        const msg = resolve(tagged('SERVER_ERROR', 'Totally new wording nobody allowlisted.'));
        expect(msg).toBe('Totally new wording nobody allowlisted.');
        expect(msg).not.toBe(errorCopy('GENERIC').message);
    });

    it('passes the backend credit-limit copy through untouched', () => {
        const backend = "You've used up today's questions on the free plan. They refill tomorrow, or upgrade if you cannot wait.";
        expect(resolve(tagged('RATE_LIMITED', backend))).toBe(backend);
    });

    it('blames our side, not the user, on a network failure', () => {
        // We cannot yet tell "your wifi is off" from "our server is down"; saying
        // it is our fault is the safer error of the two.
        const msg = resolve(new Error('Failed to fetch'));
        expect(msg).toContain('broke on my side, not yours');
        expect(msg).not.toMatch(/check your connection/i);
    });

    it('falls back to generic for an untagged internal error', () => {
        // A real JS bug must never leak its message to the user.
        const msg = resolve(new Error("Cannot read properties of undefined (reading 'map')"));
        expect(msg).toBe('That did not go through. Say it again and I will sort it out.');
        expect(msg).not.toMatch(/undefined/);
    });

    it('never surfaces a raw stack-ish message', () => {
        for (const raw of ['TypeError: x is not a function', 'ECONNREFUSED 127.0.0.1:8000']) {
            expect(resolve(new Error(raw))).toBe(errorCopy('GENERIC').message);
        }
    });
});
