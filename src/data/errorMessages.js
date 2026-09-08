/**
 * VENTY error copy — the messages shown when something goes wrong.
 *
 * SOURCE OF TRUTH: "VENTY error messages and glossary.xlsx", sheet "Error messages".
 * Text is VERBATIM from the sheet. Do not reword here — edit the sheet, otherwise
 * the copy drifts from what marketing signed off. Same rule as src/data/glossary.js.
 *
 * ONLY the rows whose error the app actually detects today are listed. Rows for
 * undetectable states (no internet vs. our server being down, app-needs-update,
 * maintenance, KYC pending, message-too-long) are deliberately absent: shipping
 * copy for a branch that can never run just creates dead code and the false
 * impression the case is handled. See ERROR_COPY_ON_HOLD at the bottom for the
 * list and what each one is waiting on.
 *
 * `humour` mirrors the sheet's own column and is a safety flag, not a style note:
 * 'off' marks the messages where money, security or law is at stake and VENTY
 * must not be charming. Keep it accurate if these are ever edited.
 */

export const ERROR_COPY = {
    // ── Connection ────────────────────────────────────────────────────────────
    TIMEOUT: {
        humour: 'light',
        message: 'That took so long even I got bored. Give it one more shot.',
    },

    // ── System ────────────────────────────────────────────────────────────────
    // Used for BOTH a 5xx and a failed fetch. A failed fetch could be the user's
    // network or our server, and we cannot yet tell which (no navigator.onLine
    // wiring). "It's on my side" is the safer thing to say wrongly: telling
    // someone to check their wifi while our server is down is the worse error.
    SERVER_ERROR: {
        humour: 'light',
        message: 'Something broke on my side, not yours, so do not go blaming your phone. Give me a minute.',
    },
    GENERIC: {
        humour: 'light',
        message: 'That did not go through. Say it again and I will sort it out.',
    },

    // ── Account ───────────────────────────────────────────────────────────────
    NOT_LOGGED_IN: {
        humour: 'light',
        message: 'You are signed out, so I cannot see your street. Log back in and we pick up where we left off.',
    },
    SESSION_EXPIRED: {
        humour: 'off',   // security — no wit here
        message: 'Your session timed out for safety. Sign in again and carry on.',
    },
};

/**
 * Sheet rows deliberately NOT implemented yet, and what each is blocked on.
 * Kept here so the gap is visible in code rather than living in someone's head.
 *
 *   No internet on user device   - needs navigator.onLine + online/offline events
 *   Weak or dropping signal      - same
 *   Feature temporarily down     - no feature-flag/health surface
 *   App needs update             - no client version check
 *   Under maintenance            - no maintenance flag from the backend
 *   Empty message sent           - send button is disabled on empty input, so the
 *                                  state is unreachable by design
 *   Message too long             - cannot fire: input is capped at maxLength 2000
 *                                  and the backend truncates at 2000, so the user
 *                                  is silently cut off instead of told
 *   Unsupported language/script  - no script detection
 *   KYC pending                  - no KYC account state
 *   Delisted or suspended stock  - not surfaced by the data layer
 */
export const ERROR_COPY_ON_HOLD = Object.freeze([
    'No internet on user device',
    'Weak or dropping signal',
    'Feature temporarily down',
    'App needs update',
    'Under maintenance',
    'Empty message sent',
    'Message too long',
    'Unsupported language or script',
    'KYC pending',
    'Delisted or suspended stock',
]);

/** Look up copy by key. Unknown key falls back to GENERIC rather than throwing. */
export function errorCopy(key) {
    return (key && ERROR_COPY[key]) || ERROR_COPY.GENERIC;
}
