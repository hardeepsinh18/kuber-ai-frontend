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

// Matches the Cognito user pool's password policy: 8+ chars, upper, lower, number, symbol.
export const validatePassword = (password) =>
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
