// User-facing copy for scanner failures.
//
// The panel used to print whatever it had, e.g. "Scan failed: HTTP 504". When
// the backend is unreachable CloudFront returns an HTML error page, the JSON
// parse falls back to {}, and the bare status code leaked into the UI. Nothing
// here should ever show a status code, a stack trace or an internal name.

export const SCAN_MESSAGES = {
    unavailable: "We couldn't reach the scanners just now. Please try again in a minute.",
    busy:        'Lots of scans are running right now. Please try again in a few seconds.',
    signIn:      'Your session has expired. Please sign in again to run scans.',
    expired:     'This scan expired before it finished. Please run it again.',
    failed:      "This scan couldn't finish. Please run it again.",
    timeout:     'This scan is taking longer than usual. Please try again in a minute.',
    comboOff:    "Combining scanners isn't available right now. You can still run one scanner at a time.",
    generic:     'Something went wrong while starting the scan. Please try again.',
};

// Backend validation / limit messages are written for users (e.g. "Pick at least
// 2 scanners to combine."), so they may be shown as-is — but only short, plain
// sentences, never an HTML page or a long technical dump.
function plainDetail(detail) {
    const msg = typeof detail === 'string' ? detail : detail?.message;
    if (typeof msg !== 'string') return null;
    const m = msg.trim();
    if (!m || m.length > 140 || /[<>{}]|HTTP\s*\d{3}|Traceback|Exception/i.test(m)) return null;
    return m;
}

/**
 * Message for a failed START request (POST /scanner or /scanner/combo).
 * @param {number} status  HTTP status (0 when the request never got a response)
 * @param {object} data    parsed JSON body, or {} when it wasn't JSON
 * @param {{combo?: boolean}} opts
 */
export function startErrorMessage(status, data = {}, { combo = false } = {}) {
    const detail = data?.detail;
    if (!status || status >= 500) return SCAN_MESSAGES.unavailable;
    if (status === 401 || status === 403) return SCAN_MESSAGES.signIn;
    if (status === 429) {
        if (detail?.error === 'scanner_busy') return SCAN_MESSAGES.busy;
        return plainDetail(detail) || SCAN_MESSAGES.busy;
    }
    if (combo && (status === 404 || status === 405)) return SCAN_MESSAGES.comboOff;
    if (status === 400 || status === 422) return plainDetail(detail) || SCAN_MESSAGES.generic;
    return SCAN_MESSAGES.generic;
}

/**
 * How to react to a STATUS poll response.
 *  - 'retry': a transient blip (gateway timeout, server restarting) — keep polling.
 *    The job lives in Redis and keeps running server-side, so one bad poll must
 *    not throw away a scan that is about to finish.
 *  - 'fail':  terminal; `message` is the user-facing copy.
 */
export function pollOutcome(status) {
    if (!status || status >= 500 || status === 429) return { action: 'retry' };
    if (status === 404 || status === 410) return { action: 'fail', message: SCAN_MESSAGES.expired };
    if (status === 401 || status === 403) return { action: 'fail', message: SCAN_MESSAGES.signIn };
    return { action: 'fail', message: SCAN_MESSAGES.failed };
}
