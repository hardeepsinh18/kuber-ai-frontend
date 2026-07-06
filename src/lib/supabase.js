// AWS Cognito auth via AWS Amplify v6 (replaces the former Supabase client).
// Configures Amplify once at import time and exposes small helpers for AuthContext.
// File kept at this path so importers don't move; it no longer talks to Supabase.
import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';

// region (ap-south-1) is inferred by Amplify from the pool id; kept for parity/docs.
const region           = import.meta.env.VITE_COGNITO_REGION;
const userPoolId       = import.meta.env.VITE_COGNITO_USER_POOL_ID;   // ap-south-1_VdpuGVS6b
const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID;      // app client id
const oauthDomain      = import.meta.env.VITE_COGNITO_DOMAIN;         // kuberai-auth.auth.ap-south-1.amazoncognito.com

// True when Cognito is configured. Exported as `supabaseConfigured` alias too, since
// existing components read that flag (now means simply "auth configured").
export const authConfigured = !!(userPoolId && userPoolClientId);
export const supabaseConfigured = authConfigured;

if (authConfigured) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          oauth: {
            domain: oauthDomain,
            scopes: ['openid', 'email', 'profile'],
            // Dynamic per-domain: aws.72street.ai returns to itself — no hardcoded host.
            redirectSignIn: [window.location.origin],
            redirectSignOut: [window.location.origin],
            responseType: 'code', // Authorization Code + PKCE (SPA-safe)
          },
        },
      },
    },
  });
} else if (import.meta.env.DEV) {
  console.warn(
    'Cognito env vars missing. Set VITE_COGNITO_USER_POOL_ID / VITE_COGNITO_CLIENT_ID / VITE_COGNITO_DOMAIN.'
  );
}

// The Cognito ID token (the JWT the backend validates: aud = app client id, carries
// email). Returns null if not signed in / not configured.
export async function getIdToken() {
  if (!authConfigured) return null;
  try {
    const session = await fetchAuthSession();
    return session?.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}
