/**
 * One-shot marker for "this page load is the return from a sign-out".
 *
 * Cognito OAuth is configured with redirectSignOut = window.location.origin, so
 * Amplify's signOut() ends in a full-page redirect through the hosted-UI logout
 * endpoint and back to "/". That is a fresh mount of App, which replayed the
 * splash — and since the landing route is "/" and the user is now signed out,
 * AuthGate immediately bounced them to /login. The user saw: login → splash →
 * login.
 *
 * Lives here rather than in App.jsx because AuthContext is what writes it, and
 * AuthContext importing App.jsx would close an import cycle (App renders
 * AuthProvider).
 *
 * Neither function may throw: sessionStorage raises in Safari private mode and
 * when storage is disabled, and this runs during App's first render.
 */

const SIGNING_OUT_KEY = 'venty:signing-out';

export function markSigningOut() {
  try {
    sessionStorage.setItem(SIGNING_OUT_KEY, '1');
  } catch {
    /* storage unavailable — worst case the splash plays once on the way out */
  }
}

/**
 * Read and clear. One-shot by design: only the load immediately following the
 * sign-out skips the splash, so an ordinary reload later still gets it. This is
 * NOT the per-session gate that was reverted on 2026-08-04.
 */
export function consumeSignOutRedirect() {
  try {
    const signingOut = sessionStorage.getItem(SIGNING_OUT_KEY) === '1';
    if (signingOut) sessionStorage.removeItem(SIGNING_OUT_KEY);
    return signingOut;
  } catch {
    return false;
  }
}
