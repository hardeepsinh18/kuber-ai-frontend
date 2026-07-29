/**
 * Regression test for QA-C-002 (audit run 2026-07-26).
 *
 * VITE_ADMIN_EMAILS is not set in the deploy workflow, so the old guard compiled to
 * `"".split(",").filter(Boolean)` -> [] and locked every human out of /admin.
 * The guard now reads the Cognito `cognito:groups` claim, which needs no build-time
 * configuration and cannot silently compile to empty.
 *
 * Runs with VITE_ADMIN_EMAILS unset — the deployed configuration.
 */
import { describe, it, expect } from 'vitest';
import { isAdmin } from './AdminGuard';

describe('QA-C-002 admin recognition without build-time config', () => {
    it('admits a user carrying the cognito admin group', () => {
        expect(isAdmin({ email: 'ops@72street.ai', groups: ['admin'] })).toBe(true);
    });

    it('is case-insensitive about the group name', () => {
        expect(isAdmin({ email: 'ops@72street.ai', groups: ['Admin'] })).toBe(true);
    });

    it('admits an admin who is also in other groups', () => {
        expect(isAdmin({ email: 'ops@72street.ai', groups: ['beta', 'admin'] })).toBe(true);
    });

    it('rejects an ordinary signed-in user', () => {
        expect(isAdmin({ email: 'user@example.com', groups: [] })).toBe(false);
    });

    it('rejects a user with no group claim at all', () => {
        expect(isAdmin({ email: 'user@example.com' })).toBe(false);
    });

    it('rejects null/undefined users rather than throwing', () => {
        expect(isAdmin(null)).toBe(false);
        expect(isAdmin(undefined)).toBe(false);
        expect(isAdmin({})).toBe(false);
    });

    it('does not ship an internal email allowlist in the bundle', async () => {
        const mod = await import('./AdminGuard');
        expect(mod.ADMIN_EMAILS).toBeUndefined();
    });
});
