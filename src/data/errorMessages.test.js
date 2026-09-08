import { describe, it, expect } from 'vitest';
import { ERROR_COPY, ERROR_COPY_ON_HOLD, errorCopy } from './errorMessages';

describe('error copy registry', () => {
    it('carries the sheet copy verbatim', () => {
        expect(ERROR_COPY.TIMEOUT.message)
            .toBe('That took so long even I got bored. Give it one more shot.');
        expect(ERROR_COPY.SERVER_ERROR.message)
            .toBe('Something broke on my side, not yours, so do not go blaming your phone. Give me a minute.');
        expect(ERROR_COPY.GENERIC.message)
            .toBe('That did not go through. Say it again and I will sort it out.');
        expect(ERROR_COPY.NOT_LOGGED_IN.message)
            .toBe('You are signed out, so I cannot see your street. Log back in and we pick up where we left off.');
        expect(ERROR_COPY.SESSION_EXPIRED.message)
            .toBe('Your session timed out for safety. Sign in again and carry on.');
    });

    it('every entry has a message and a humour flag', () => {
        for (const [key, v] of Object.entries(ERROR_COPY)) {
            expect(v.message, key).toBeTruthy();
            expect(['light', 'off'], key).toContain(v.humour);
        }
    });

    // The sheet marks security/money/legal rows "Off" — humour must not creep in.
    it('keeps humour off where the sheet says off', () => {
        expect(ERROR_COPY.SESSION_EXPIRED.humour).toBe('off');
    });

    it('carries no wording the old regex allowlist depended on', () => {
        // Guards the fix: routing is by code now, so copy must be free to change.
        // If someone reintroduces a text allowlist, these strings would fail it.
        const old = /session expired|too many requests|not found|server encountered|request failed/i;
        expect(old.test(ERROR_COPY.SERVER_ERROR.message)).toBe(false);
        expect(old.test(ERROR_COPY.SESSION_EXPIRED.message)).toBe(false);
        expect(old.test(ERROR_COPY.GENERIC.message)).toBe(false);
    });
});

describe('errorCopy()', () => {
    it('resolves a known key', () => {
        expect(errorCopy('TIMEOUT').message).toContain('even I got bored');
    });

    it('falls back to GENERIC rather than throwing', () => {
        expect(errorCopy('NO_SUCH_KEY')).toBe(ERROR_COPY.GENERIC);
        expect(errorCopy(undefined)).toBe(ERROR_COPY.GENERIC);
        expect(errorCopy(null)).toBe(ERROR_COPY.GENERIC);
        expect(errorCopy('')).toBe(ERROR_COPY.GENERIC);
    });
});

describe('deliberately unimplemented rows', () => {
    it('documents what is on hold, so the gap stays visible', () => {
        expect(ERROR_COPY_ON_HOLD).toContain('No internet on user device');
        expect(ERROR_COPY_ON_HOLD).toContain('Message too long');
        expect(ERROR_COPY_ON_HOLD).toContain('KYC pending');
    });

    it('does not ship copy for an error the app cannot detect', () => {
        // A key here would mean dead code and a false sense the case is handled.
        for (const k of ['NO_INTERNET', 'WEAK_SIGNAL', 'APP_UPDATE', 'MAINTENANCE',
                         'MESSAGE_TOO_LONG', 'KYC_PENDING', 'EMPTY_MESSAGE']) {
            expect(ERROR_COPY[k], k).toBeUndefined();
        }
    });
});
