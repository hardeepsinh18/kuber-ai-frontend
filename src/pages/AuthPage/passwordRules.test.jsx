/**
 * The signup form enforced a password policy but never showed it. A user typed a
 * password, pressed "Create account", and only then learned it needed a symbol —
 * the rules lived solely in an error string shown AFTER a failed submit.
 *
 * PasswordRules renders the policy up front and ticks each rule as it is met.
 *
 * The important structural point: the checklist and validatePassword both read
 * PASSWORD_RULES, so the UI cannot promise a rule the validator does not enforce
 * (or omit one it does). These tests pin that they stay in agreement.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { PasswordRules } from './shared';
import { validatePassword, PASSWORD_RULES } from './authHelpers';

afterEach(cleanup);

const rowsOf = (container) =>
    [...container.querySelectorAll('li')].map((li) => li.textContent.trim());

describe('the password policy is visible before submitting', () => {
    it('shows every rule even when the field is empty', () => {
        const { container } = render(<PasswordRules password="" />);
        expect(container.querySelectorAll('li')).toHaveLength(PASSWORD_RULES.length);
        for (const rule of PASSWORD_RULES) {
            expect(container.textContent).toContain(rule.label);
        }
    });

    it('marks nothing as met for an empty password', () => {
        const { container } = render(<PasswordRules password="" />);
        expect(rowsOf(container).every((t) => t.endsWith('not met'))).toBe(true);
    });

    it('ticks only the rules actually satisfied', () => {
        // "abc" satisfies lowercase only.
        const { container } = render(<PasswordRules password="abc" />);
        const met = rowsOf(container).filter((t) => !t.endsWith('not met'));
        expect(met).toHaveLength(1);
        expect(met[0]).toContain('lowercase');
    });

    it('ticks every rule for a valid password', () => {
        const { container } = render(<PasswordRules password="Abcdef1!" />);
        expect(rowsOf(container).some((t) => t.endsWith('not met'))).toBe(false);
    });

    it('states met/not-met in TEXT, not by colour alone', () => {
        // Colour-only state is invisible to a screen reader and to anyone with a
        // colour-vision deficiency.
        const { container } = render(<PasswordRules password="abc" />);
        expect(container.textContent).toContain('not met');
        // jest-dom matchers are not set up in this project, so assert the
        // attribute directly.
        expect(container.querySelector('ul').getAttribute('aria-label')).toBeTruthy();
    });
});

describe('the checklist and the validator cannot drift apart', () => {
    it('validatePassword passes exactly when every rule passes', () => {
        for (const pw of ['', 'abc', 'Abcdef1', 'Abcdef!', 'abcdef1!', 'ABCDEF1!', 'Abcdef1!', 'Str0ng#Pass']) {
            expect(validatePassword(pw)).toBe(PASSWORD_RULES.every((r) => r.test(pw)));
        }
    });

    it('rejects a password failing any single rule', () => {
        expect(validatePassword('Abcdefg!')).toBe(false);   // no number
        expect(validatePassword('Abcdef12')).toBe(false);   // no symbol
        expect(validatePassword('abcdef1!')).toBe(false);   // no uppercase
        expect(validatePassword('ABCDEF1!')).toBe(false);   // no lowercase
        expect(validatePassword('Ab1!')).toBe(false);       // too short
    });

    it('accepts a password meeting all of them', () => {
        expect(validatePassword('Abcdef1!')).toBe(true);
    });

    it('treats a missing password as invalid rather than throwing', () => {
        expect(validatePassword(undefined)).toBe(false);
        expect(validatePassword(null)).toBe(false);
    });
});
