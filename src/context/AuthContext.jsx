import React, { createContext, useContext, useEffect, useState } from 'react';
// Side-effect import runs Amplify.configure(); helpers below drive the session.
import { authConfigured, getIdToken } from '../lib/auth';
import { getApiBase } from '../lib/apiBase';
import { setStorageIdentity, clearAllLocalChats } from '../lib/chatStorage';
import {
  signIn as cognitoSignIn,
  signUp as cognitoSignUp,
  confirmSignUp as cognitoConfirmSignUp,
  resendSignUpCode as cognitoResendSignUpCode,
  signInWithRedirect,
  signOut as cognitoSignOut,
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser,
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

const DEMO_KEY = 'kuberai_demo_user';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Build our normalized user ({id, email, user_metadata.full_name}) from Cognito
  // and cache the ID token. Same shape components already expect.
  const syncFromCognito = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session?.tokens?.idToken?.toString() ?? null;
      if (!token) { setUser(null); setIdToken(null); return; }
      // Read identity from the ID token claims first — hosted-UI / Google OAuth
      // tokens lack the aws.cognito.signin.user.admin scope that
      // fetchUserAttributes() needs, so that call fails for them. The ID token
      // (openid+email+profile) already carries sub/email/name.
      const claims = session?.tokens?.idToken?.payload ?? {};
      let email = claims.email || '';
      let fullName = claims.name || (email ? email.split('@')[0] : '');
      let id = claims.sub || '';
      if (!email || !id) {
        try {
          const attrs = await fetchUserAttributes();
          email = email || attrs?.email || '';
          fullName = claims.name || attrs?.name || (email ? email.split('@')[0] : '');
          id = id || attrs?.sub || '';
        } catch (_) { /* attributes may be unavailable for some token types */ }
      }
      if (!id) {
        try { const cu = await getCurrentUser(); id = cu?.userId || cu?.username || ''; } catch (_) {}
      }
      setIdToken(token);
      // QA-C-002: surface the Cognito group claim so AdminGuard can gate on it
      // without a build-time email list baked into the public bundle.
      const groups = Array.isArray(claims['cognito:groups']) ? claims['cognito:groups'] : [];
      // SEC-C-002: bind the local chat cache to this identity BEFORE publishing the
      // user, so no consumer can read the previous profile's namespace in between.
      setStorageIdentity(id);
      setUser({ id, email, groups, user_metadata: { full_name: fullName } });
    } catch {
      setStorageIdentity(null);
      setUser(null); setIdToken(null);
    }
  };

  // Best-effort: ensure the RDS `users` row exists (and carries full_name) right
  // after a real sign-in, instead of waiting for the first chat action to create
  // it lazily. Idempotent upsert server-side, so failures here are silent —
  // _ensure_app_user still runs on the first /chats call either way.
  const syncUserToBackend = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session?.tokens?.idToken?.toString();
      if (!token) return;
      const fullName = session?.tokens?.idToken?.payload?.name || null;
      await fetch(`${getApiBase()}/api/v1/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: fullName }),
      });
    } catch (_) { /* best-effort */ }
  };

  useEffect(() => {
    if (!authConfigured) {
      // Demo mode — restore from localStorage (unchanged behavior when unconfigured)
      try {
        const saved = localStorage.getItem(DEMO_KEY);
        if (saved) {
          const demo = JSON.parse(saved);
          setStorageIdentity(demo?.id);
          setUser(demo);
        }
      } catch (_) {}
      setLoading(false);
      return;
    }

    // Initial load — also completes any pending Google hosted-UI redirect (?code=…)
    syncFromCognito().finally(() => setLoading(false));

    // Auth events: sign-in (incl. Google redirect), sign-out, token refresh
    const unlisten = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
        case 'signInWithRedirect':
          syncFromCognito();
          syncUserToBackend();
          break;
        case 'tokenRefresh':
          syncFromCognito();
          break;
        case 'signedOut':
        case 'tokenRefresh_failure':
        case 'signInWithRedirect_failure':
          // SEC-C-002: covers sign-out triggered outside our signOut() (another
          // tab, session expiry) — purge here too or the cache outlives the session.
          clearAllLocalChats();
          setStorageIdentity(null);
          setUser(null); setIdToken(null);
          break;
        default:
          break;
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncFromCognito();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      unlisten();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const signInWithEmail = async (email, password) => {
    // SEC-C-007: the no-password demo branch is gated on import.meta.env.DEV, which
    // Vite statically replaces with false and dead-code-eliminates, so it physically
    // cannot exist in a production bundle. Gating on the runtime truthiness of a
    // config value meant a misconfigured deploy silently degraded OPEN — any
    // email+password pair minted a session.
    if (!authConfigured && !import.meta.env.DEV) {
      throw new Error('Sign-in is not available right now. Please try again later.');
    }
    if (!authConfigured) {
      if (!email || !password) throw new Error('Enter your email and password');
      const demoUser = { id: 'demo', email, user_metadata: { full_name: email.split('@')[0] } };
      localStorage.setItem(DEMO_KEY, JSON.stringify(demoUser));
      setStorageIdentity(demoUser.id);
      setUser(demoUser);
      return demoUser;
    }
    const res = await cognitoSignIn({ username: email, password });
    if (!res?.isSignedIn) {
      // Amplify v6 resolves (doesn't throw) when an extra step is required —
      // e.g. an unconfirmed signup or a forced password reset. Surface that
      // instead of silently leaving the caller with no session.
      const step = res?.nextStep?.signInStep;
      if (step === 'CONFIRM_SIGN_UP') {
        throw new Error('Please confirm your email before signing in.');
      }
      throw new Error(step ? `Additional step required: ${step}` : 'Sign-in did not complete. Please try again.');
    }
    await syncFromCognito();
    await syncUserToBackend();
    return res;
  };

  const signUpWithEmail = async (email, password, metadata = {}) => {
    // SEC-C-007: see signInWithEmail — no account creation without a real provider
    // in a production build.
    if (!authConfigured && !import.meta.env.DEV) {
      throw new Error('Sign-up is not available right now. Please try again later.');
    }
    if (!authConfigured) {
      if (!email || !password) throw new Error('Enter your email and password');
      const demoUser = { id: 'demo', email, user_metadata: { full_name: metadata.full_name || email.split('@')[0] } };
      localStorage.setItem(DEMO_KEY, JSON.stringify(demoUser));
      setStorageIdentity(demoUser.id);
      setUser(demoUser);
      return demoUser;
    }
    // Cognito verifies email out-of-band per pool settings (confirmation code/link).
    const res = await cognitoSignUp({
      username: email,
      password,
      options: { userAttributes: { email, ...(metadata.full_name ? { name: metadata.full_name } : {}) } },
    });
    return res;
  };

  // Completes signup with the code Cognito emailed. Does NOT sign the user in —
  // callers should follow a successful confirm with signInWithEmail.
  const confirmSignUpCode = async (email, code) => {
    if (!authConfigured) return { isSignUpComplete: true };
    return cognitoConfirmSignUp({ username: email, confirmationCode: code });
  };

  const resendConfirmationCode = async (email) => {
    if (!authConfigured) return;
    await cognitoResendSignUpCode({ username: email });
  };

  const signInWithGoogle = async () => {
    if (!authConfigured) throw new Error('Google sign-in requires Cognito');
    // Redirects to the Cognito hosted UI (Google federation); returns to
    // window.location.origin, so aws.72street.ai comes back to itself.
    await signInWithRedirect({ provider: 'Google' });
  };

  // Force a token refresh and return the fresh ID token (or null on failure).
  // Used by the chat flow to recover from a 401 without a full re-sign-in.
  const refreshSession = async () => {
    if (!authConfigured) return null;
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      const token = session?.tokens?.idToken?.toString() ?? null;
      setIdToken(token);
      if (token) await syncFromCognito();
      return token;
    } catch {
      return null;
    }
  };

  // SEC-C-002: signing out must end the session ON THIS DEVICE — purge the cached
  // chats before clearing the user, so a shared/family device leaves no financial
  // queries readable by the next person to sign in.
  const signOut = async () => {
    if (!authConfigured) {
      localStorage.removeItem(DEMO_KEY);
      clearAllLocalChats();
      setStorageIdentity(null);
      setUser(null);
      return;
    }
    await cognitoSignOut();
    clearAllLocalChats();
    setStorageIdentity(null);
    setUser(null);
    setIdToken(null);
  };

  const value = {
    user,
    // Back-compat shape: some code reads session?.access_token.
    session: idToken ? { access_token: idToken } : null,
    loading,
    isAuthenticated: !!user,
    // The Cognito ID token — attached to /api as Authorization: Bearer and validated
    // by the backend (aud = app client id, carries email). Name kept as accessToken.
    accessToken: idToken,
    signInWithEmail,
    signUpWithEmail,
    confirmSignUpCode,
    resendConfirmationCode,
    signInWithGoogle,
    signOut,
    refreshSession,
    // QA-C-014: `authConfigured` is the honest name — this app authenticates via
    // AWS Cognito (Amplify); Supabase was retired. New code should read this key.
    authConfigured,
    // Deprecated alias, kept so the existing consumers (Sidebar, LoginModal,
    // ChatHistoryContext, ...) keep working. Renaming all of them in the same commit
    // as the file move would make a mechanical change hard to review and risks a
    // missed call site silently reading undefined — which is falsy and would signal
    // "auth not configured", i.e. fail OPEN. Migrate call sites separately, then drop.
    supabaseConfigured: authConfigured,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
