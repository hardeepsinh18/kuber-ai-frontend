import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * QA-C-002: the admin identity list is NOT shipped in the JS bundle.
 *
 * The previous implementation read VITE_ADMIN_EMAILS at build time. That variable
 * is not set in the deploy workflow, so it compiled to `"".split(",")` -> [] and
 * `isAdmin()` returned false for every human being — a silent, total outage of the
 * admin dashboard. Baking it in would also have disclosed internal staff emails to
 * every anonymous visitor who read the bundle.
 *
 * Authorization is enforced SERVER-SIDE by require_admin (app/core/supabase_auth.py),
 * which verifies the Cognito ID token and checks its email against the server's own
 * ADMIN_EMAILS env var. This component is therefore a UX guard, not a security
 * boundary: it decides whether to show the page, never whether to release data.
 *
 * It reads the `cognito:groups` claim, which needs no build-time configuration and
 * cannot silently compile to empty.
 */
const ADMIN_GROUP = 'admin';

// Optional escape hatch for local dev / demo mode, where there is no Cognito pool
// to carry a group claim. Absent in the deployed build, which is the point.
const DEV_ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdmin(user) {
  if (!user) return false;
  const groups = user.groups;
  if (Array.isArray(groups) && groups.some((g) => String(g).toLowerCase() === ADMIN_GROUP)) {
    return true;
  }
  if (DEV_ADMIN_EMAILS.length && user.email) {
    return DEV_ADMIN_EMAILS.includes(user.email.toLowerCase());
  }
  return false;
}

export function AdminGuard({ children }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (!isAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export { isAdmin, ADMIN_GROUP };
