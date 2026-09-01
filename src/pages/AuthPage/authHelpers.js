import { getApiBase } from '../../lib/apiBase';

const SUBSCRIBE_ENDPOINT = `${getApiBase()}/api/v1/subscribe`;

// Record a marketing opt-in when the user affirmatively ticks the consent box.
// Fire-and-forget with keepalive so it survives the navigation to '/', and fully
// swallowed — a failed opt-in must never block or fail the sign-in/sign-up flow.
export function postSubscribe(email) {
    try {
        fetch(SUBSCRIBE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
            body: JSON.stringify({ email, opted_in: true, source: 'login_page' }),
        }).catch(err => console.warn('subscribe failed:', err?.message || err));
    } catch (err) {
        console.warn('subscribe error:', err?.message || err);
    }
}

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// The Cognito user pool's password policy, as ONE list that both the validator
// and the on-screen checklist read. They were previously the same rules written
// twice — once here and once in the error string — which is how a UI can end up
// promising something the backend does not enforce (or vice versa).
export const PASSWORD_RULES = [
    { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { id: 'upper',  label: 'One uppercase letter',  test: (p) => /[A-Z]/.test(p) },
    { id: 'lower',  label: 'One lowercase letter',  test: (p) => /[a-z]/.test(p) },
    { id: 'number', label: 'One number',            test: (p) => /[0-9]/.test(p) },
    { id: 'symbol', label: 'One symbol (!@#$…)',    test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const validatePassword = (password) =>
    PASSWORD_RULES.every((r) => r.test(password || ''));
