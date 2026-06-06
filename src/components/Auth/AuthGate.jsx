import React from 'react';
import { LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Auth gate: when Supabase is configured and user is not logged in,
 * show "Sign in to use KuberAI by 72 Street" instead of the chat.
 * When Supabase is not configured, allow guest access (no gate).
 */
const AuthGate = ({ children, setShowLogin }) => {
  const { isAuthenticated, supabaseConfigured, loading } = useAuth();

  // If Supabase is not configured, allow guest access
  if (!supabaseConfigured) {
    return children;
  }

  // Show loading briefly
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show gate
  if (!isAuthenticated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <div className="max-w-md space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Sign in to use KuberAI by 72Street
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Create an account or sign in to ask questions about markets, stocks, and mutual funds.
          </p>
          {setShowLogin && (
            <button
              onClick={() => setShowLogin(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <LogIn size={20} />
              Sign in
            </button>
          )}
        </div>
      </div>
    );
  }

  return children;
};

export default AuthGate;
