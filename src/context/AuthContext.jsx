import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const DEMO_KEY = 'kuberai_demo_user';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      // Demo mode — restore from localStorage
      try {
        const saved = localStorage.getItem(DEMO_KEY);
        if (saved) setUser(JSON.parse(saved));
      } catch (_) {}
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          setUser(session?.user ?? null);
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const signInWithEmail = async (email, password) => {
    if (!supabase) {
      // Demo: accept any non-empty credentials
      if (!email || !password) throw new Error('Enter your email and password');
      const demoUser = {
        id: 'demo',
        email,
        user_metadata: { full_name: email.split('@')[0] },
      };
      localStorage.setItem(DEMO_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
      return demoUser;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUpWithEmail = async (email, password, metadata = {}) => {
    if (!supabase) {
      // Demo: treat sign-up same as sign-in
      if (!email || !password) throw new Error('Enter your email and password');
      const demoUser = {
        id: 'demo',
        email,
        user_metadata: { full_name: metadata.full_name || email.split('@')[0] },
      };
      localStorage.setItem(DEMO_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
      return demoUser;
    }
    const { data, error } = await supabase.auth.signUp({
      email, password,
      // Dynamic per-domain: confirmation link returns to whichever site the user signed up on.
      options: { data: metadata, emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Google sign-in requires Supabase');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Dynamic per-domain: aws.72street.ai returns to aws, kuber-uat returns to kuber-uat.
      // No hardcoded domain, so UAT (Vercel) is unaffected.
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return data;
  };

  // Force a token refresh and return the fresh access token (or null on failure).
  // Used by the chat flow to recover from a 401 without making the user re-sign-in.
  const refreshSession = async () => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data?.session) return null;
      setSession(data.session);
      setUser(data.session.user ?? null);
      return data.session.access_token ?? null;
    } catch {
      return null;
    }
  };

  const signOut = async () => {
    if (!supabase) {
      localStorage.removeItem(DEMO_KEY);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    accessToken: session?.access_token ?? null,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    refreshSession,
    supabaseConfigured: !!supabase,
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
