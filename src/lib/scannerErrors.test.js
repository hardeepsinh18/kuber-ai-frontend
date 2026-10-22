import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCAN_MESSAGES, startErrorMessage, pollOutcome } from './scannerErrors';

const RAW = /HTTP\s*\d{3}|\b5\d\d\b|\b4\d\d\b|<|Traceback/;

describe('scan start errors are plain language', () => {
    it('a gateway timeout (the reported "Scan failed: HTTP 504") reads as a temporary outage', () => {
        // CloudFront answers with an HTML page, so the parsed body is {}.
        expect(startErrorMessage(504, {})).toBe(SCAN_MESSAGES.unavailable);
        expect(startErrorMessage(502, {})).toBe(SCAN_MESSAGES.unavailable);
        expect(startErrorMessage(500, {})).toBe(SCAN_MESSAGES.unavailable);
        expect(startErrorMessage(0)).toBe(SCAN_MESSAGES.unavailable);
    });

    it('a full scan queue says to retry shortly', () => {
        expect(startErrorMessage(429, { detail: { error: 'scanner_busy', message: 'x' } })).toBe(SCAN_MESSAGES.busy);
    });

    it("keeps the backend's own friendly limit message", () => {
        const msg = "You've used up today's questions on the free plan. They refill tomorrow, or upgrade if you cannot wait.";
        expect(startErrorMessage(429, { detail: { error: 'credit_limit_exceeded', message: msg } })).toBe(msg);
    });

    it('shows short validation messages but never technical dumps', () => {
        expect(startErrorMessage(400, { detail: 'Pick at least 2 scanners to combine.' })).toBe('Pick at least 2 scanners to combine.');
        expect(startErrorMessage(400, { detail: 'Unknown scanner. Available: ' + 'A, '.repeat(80) })).toBe(SCAN_MESSAGES.generic);
        expect(startErrorMessage(422, { detail: [{ loc: ['body'], msg: 'field required' }] })).toBe(SCAN_MESSAGES.generic);
    });

    it('auth and missing-endpoint cases', () => {
        expect(startErrorMessage(401, {})).toBe(SCAN_MESSAGES.signIn);
        expect(startErrorMessage(404, {}, { combo: true })).toBe(SCAN_MESSAGES.comboOff);
        expect(startErrorMessage(404, {})).toBe(SCAN_MESSAGES.generic);
    });

    it('no message ever contains a status code or markup', () => {
        for (const m of Object.values(SCAN_MESSAGES)) expect(m).not.toMatch(RAW);
        for (const s of [0, 400, 401, 403, 404, 405, 409, 410, 422, 429, 500, 502, 503, 504]) {
            expect(startErrorMessage(s, {})).not.toMatch(RAW);
        }
    });
});

describe('status polling survives a blip', () => {
    it('retries gateway errors, restarts and rate limits instead of failing the scan', () => {
        for (const s of [0, 500, 502, 503, 504, 429]) expect(pollOutcome(s).action).toBe('retry');
    });

    it('fails clearly when the job is gone', () => {
        expect(pollOutcome(410)).toEqual({ action: 'fail', message: SCAN_MESSAGES.expired });
        expect(pollOutcome(404)).toEqual({ action: 'fail', message: SCAN_MESSAGES.expired });
    });
});

describe('panel wiring', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const panel = fs.readFileSync(path.resolve(here, '../components/Chat/ScannerPanel.jsx'), 'utf8');

    it('never builds an error string from a status code', () => {
        expect(panel).not.toMatch(/HTTP \$\{/);
        expect(panel).not.toContain('Scan failed:');
    });

    it('does not let hung status checks pile up', () => {
        expect(panel).toContain('if (inFlight) return;');
    });

    it('offers a retry instead of a dead-end error', () => {
        expect(panel).toContain('data-testid="scanner-error"');
        expect(panel).toContain('Try again');
    });
});
