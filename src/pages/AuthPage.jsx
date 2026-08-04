import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import KuberLogo from '../components/KuberLogo';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';
import useSkipHeavyBackdrop from '../hooks/useSkipHeavyBackdrop';
import { getApiBase } from '../lib/apiBase';

const SUBSCRIBE_ENDPOINT = `${getApiBase()}/api/v1/subscribe`;

// Record a marketing opt-in when the user affirmatively ticks the consent box.
// Fire-and-forget with keepalive so it survives the navigation to '/', and fully
// swallowed — a failed opt-in must never block or fail the sign-in/sign-up flow.
function postSubscribe(email) {
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

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

export default function AuthPage() {
    const navigate = useNavigate();
    const { signInWithEmail, signUpWithEmail, confirmSignUpCode, resendConfirmationCode, forgotPassword, confirmForgotPassword, signInWithGoogle, isAuthenticated, supabaseConfigured } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const reducedMotion = usePrefersReducedMotion();
    // QA-C-005: the sign-in screen is the FIRST thing a new user loads, so a 6.8 MB
    // decorative video here is the worst-placed download in the app. Skipped on narrow
    // viewports and under saveData, in addition to the reduced-motion skip.
    const skipHeavyBackdrop = useSkipHeavyBackdrop();

    // mode: 'signin' | 'signup' | 'confirm' (confirm = enter the emailed code after signup)
    //       | 'forgot' (enter email to request a reset code) | 'reset' (enter code + new password)
    const [mode,      setMode]    = useState('signin');
    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [confirmCode, setConfirmCode] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    // CONF-D-011 (DPDP): marketing consent must be OPT-IN. This defaulted to true,
    // so every signup pre-agreed to SMS/WhatsApp marketing without an affirmative
    // act — a pre-ticked box is not valid consent under the DPDP Act, and bundling
    // it with the signup flow makes it worse. Defaults to false; the user has to
    // tick it deliberately.
    //
    // When ticked, handleContinue records the consent via POST /api/v1/subscribe
    // into the marketing_subscribers table (timestamped created_at/updated_at).
    // Only an affirmative tick is transmitted — an untouched box records nothing.
    // A user-facing withdrawal UI is still TODO (the backend accepts opted_in=false).
    const [updates,  setUpdates]  = useState(false);
    const [error,   setError]   = useState('');
    const [info,    setInfo]    = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) navigate('/', { replace: true });
    }, [isAuthenticated, navigate]);

    const switchMode = (m) => {
        setMode(m); setError(''); setInfo('');
        setConfirmCode(''); setResetCode(''); setNewPassword(''); setConfirmNewPassword('');
    };

    const handleContinue = async (e) => {
        e.preventDefault();
        if (!email.trim()) { setError('Please enter your email address'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email'); return; }
        if (!password) { setError('Please enter your password'); return; }
        // Matches the Cognito user pool's password policy: 8+ chars, upper, lower, number, symbol.
        if (mode === 'signup' && (
            password.length < 8 ||
            !/[A-Z]/.test(password) ||
            !/[a-z]/.test(password) ||
            !/[0-9]/.test(password) ||
            !/[^A-Za-z0-9]/.test(password)
        )) {
            setError('Password must be 8+ characters with an uppercase letter, lowercase letter, number, and symbol.');
            return;
        }
        setError(''); setInfo(''); setLoading(true);
        // CONF-D-011: record the affirmative marketing opt-in (fire-and-forget).
        if (updates) postSubscribe(email.trim());
        try {
            if (mode === 'signup') {
                const res = await signUpWithEmail(email.trim(), password, { full_name: fullName.trim() });
                if (res?.isSignUpComplete) {
                    // Pool auto-confirms — no code step needed, go straight to session.
                    await signInWithEmail(email.trim(), password);
                    navigate('/', { replace: true });
                } else {
                    setMode('confirm');
                    setInfo('We emailed you a confirmation code.');
                }
            } else {
                // QA-C-001: real Cognito email+password sign-in — no phone-as-password,
                // no hardcoded 'demo1234' fallback.
                await signInWithEmail(email.trim(), password);
                navigate('/', { replace: true });
            }
        } catch (err) {
            setError(err.message || 'Something went wrong');
        } finally { setLoading(false); }
    };

    const handleConfirm = async (e) => {
        e.preventDefault();
        if (!confirmCode.trim()) { setError('Please enter the confirmation code'); return; }
        setError(''); setInfo(''); setLoading(true);
        try {
            await confirmSignUpCode(email.trim(), confirmCode.trim());
            await signInWithEmail(email.trim(), password);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.message || 'Invalid or expired code');
        } finally { setLoading(false); }
    };

    const handleResend = async () => {
        setError(''); setInfo(''); setLoading(true);
        try {
            await resendConfirmationCode(email.trim());
            setInfo('Code resent — check your email.');
        } catch (err) {
            setError(err.message || 'Could not resend code');
        } finally { setLoading(false); }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) { setError('Please enter your email address'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email'); return; }
        setError(''); setInfo(''); setLoading(true);
        try {
            await forgotPassword(email.trim());
            setMode('reset');
            setInfo('We emailed you a reset code.');
        } catch (err) {
            setError(err.message || 'Could not send reset code');
        } finally { setLoading(false); }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        if (!resetCode.trim()) { setError('Please enter the reset code'); return; }
        // Matches the Cognito user pool's password policy: 8+ chars, upper, lower, number, symbol.
        if (
            newPassword.length < 8 ||
            !/[A-Z]/.test(newPassword) ||
            !/[a-z]/.test(newPassword) ||
            !/[0-9]/.test(newPassword) ||
            !/[^A-Za-z0-9]/.test(newPassword)
        ) {
            setError('Password must be 8+ characters with an uppercase letter, lowercase letter, number, and symbol.');
            return;
        }
        if (newPassword !== confirmNewPassword) { setError('Passwords do not match'); return; }
        setError(''); setInfo(''); setLoading(true);
        try {
            await confirmForgotPassword(email.trim(), resetCode.trim(), newPassword);
            await signInWithEmail(email.trim(), newPassword);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.message || 'Invalid or expired code');
        } finally { setLoading(false); }
    };

    const handleForgotResend = async () => {
        setError(''); setInfo(''); setLoading(true);
        try {
            await forgotPassword(email.trim());
            setInfo('Code resent — check your email.');
        } catch (err) {
            setError(err.message || 'Could not resend code');
        } finally { setLoading(false); }
    };

    const handleGoogle = async () => {
        setLoading(true);
        try {
            if (!supabaseConfigured) {
                // QA-C-001: no fake/hardcoded login when auth isn't configured.
                setError('Sign-in is not available right now. Please try again later.');
                return;
            }
            const r = await signInWithGoogle();
            if (r?.url) { window.location.href = r.url; return; }
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.message || 'Google sign-in failed');
        } finally { setLoading(false); }
    };

    // Theme-aware styles
    const bg         = isDark ? '#0A0A0A' : '#F5F2E8';
    const cardBg     = isDark ? 'rgba(14,11,1,0.90)' : 'rgba(255,252,240,0.92)';
    const inputBg    = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    const inputColor = isDark ? '#fff' : '#111';
    const textMain   = isDark ? '#fff' : '#111';
    const textSub    = isDark ? 'rgba(161,161,170,1)' : 'rgba(82,82,91,1)';
    const labelColor = isDark ? 'rgba(113,113,122,1)' : 'rgba(82,82,91,1)';
    const dividerBg  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    const orColor    = isDark ? 'rgba(82,82,91,1)' : 'rgba(113,113,122,1)';
    const googleBg   = isDark ? '#fff' : '#fff';

    // The card + logo are taller than a short viewport (laptop at 100% zoom, small
    // screens). This used to be `justify-center` + `overflow-hidden`: once content
    // exceeded the viewport, centring pushed the logo off the top edge and
    // `overflow-hidden` clipped it away with no way to scroll to it — so the logo
    // was visible only when zoomed out or on a tall screen.
    // `justify-start` + `my-auto` on the inner block centres while there IS room and
    // degrades to top-aligned + scrollable when there is not, so nothing is ever
    // unreachable. overflow-x stays hidden — the decorative backdrop is what needed
    // clipping, and it is `fixed`, so it is unaffected either way.
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-start px-4 py-10 relative overflow-x-hidden overflow-y-auto"
             style={{ backgroundColor: bg }}>

            {/* QA-C-008: aria-hidden — this is a purely decorative backdrop. Without it
                the video and its two tint layers are orphaned content outside any
                landmark, which is what axe flagged as a region violation. */}
            <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
                <div className="absolute inset-0" style={{ backgroundColor: bg }} />
                {/* QA-C-004: skipped entirely under reduced motion — that also avoids
                    the ~7 MB download for users who asked not to see animation. */}
                {!reducedMotion && !skipHeavyBackdrop && (
                    <video
                        key={theme}
                        src={isDark ? '/bg-dark.mp4' : '/bg-light.mp4'}
                        autoPlay loop muted playsInline
                        preload="none"
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ opacity: isDark ? 0.40 : 0.55 }}
                    />
                )}
                <div className="absolute inset-0" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(245,242,232,0.30)' }} />
            </div>

            {/* QA-C-008: the sign-in card is the document's main content, so it needs a
                <main> landmark — exactly one per document. framer-motion renders whatever
                tag `motion.main` names, so this keeps the entrance animation. */}
            <motion.main
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-sm flex flex-col items-center my-auto">

                {/* Logo */}
                <div className="flex items-center gap-3 mb-6">
                    <KuberLogo size={44} variant={isDark ? 'mark' : 'mark-light'} />
                    <div className="flex flex-col gap-1.5">
                        <KuberLogo size={19} variant={isDark ? 'wordmark' : 'wordmark-light'} alt="Venty" />
                        <p className="text-[10px] tracking-widest uppercase" style={{ color: labelColor }}>by 72 Street</p>
                    </div>
                </div>

                {/* Heading */}
                <h1 className="text-[24px] font-bold text-center leading-snug mb-1" style={{ color: textMain }}>
                    Hi! I'm <span style={{ color: '#FDD405' }}>Venty</span>
                </h1>
                <p className="text-[13px] text-center mb-7" style={{ color: textSub }}>I bring clarity to market decisions.</p>

                {/* Card */}
                <div className="w-full rounded-2xl overflow-hidden"
                    style={{
                        background: cardBg,
                        border: '1px solid rgba(253,212,5,0.38)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: isDark
                            ? '0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(253,212,5,0.10)'
                            : '0 16px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(253,212,5,0.10)',
                    }}>

                    <div style={{ height: 3, background: 'linear-gradient(90deg, transparent 0%, #FDD405 30%, #FDD405 70%, transparent 100%)', opacity: 0.9 }} />

                    {mode !== 'confirm' && mode !== 'forgot' && mode !== 'reset' && (
                        <div style={{ display: 'flex', gap: 4, margin: '18px 24px 0', padding: 3, borderRadius: 10, background: inputBg }}>
                            {['signin', 'signup'].map(m => (
                                <button key={m} type="button" onClick={() => switchMode(m)}
                                    style={{
                                        flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                                        fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                                        background: mode === m ? '#FDD405' : 'transparent',
                                        color: mode === m ? '#111' : textSub,
                                        transition: 'background 0.15s',
                                    }}>
                                    {m === 'signin' ? 'Sign in' : 'Create account'}
                                </button>
                            ))}
                        </div>
                    )}

                    {mode === 'confirm' ? (
                        <form onSubmit={handleConfirm} className="p-6 flex flex-col gap-4">
                            <p style={{ fontSize: 13, color: textSub }}>
                                Enter the code we emailed to <span style={{ color: textMain, fontWeight: 600 }}>{email}</span>.
                            </p>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: labelColor }}>
                                    Confirmation code
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={confirmCode}
                                    onChange={e => { setConfirmCode(e.target.value); setError(''); }}
                                    placeholder="123456"
                                    autoComplete="one-time-code"
                                    autoFocus
                                    style={{
                                        width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                                        background: inputBg,
                                        border: '1px solid rgba(253,212,5,0.20)',
                                        borderRadius: 10, color: inputColor, fontSize: 14, outline: 'none', letterSpacing: 2,
                                    }}
                                    onFocus={e => { e.target.style.borderColor = 'rgba(253,212,5,0.60)'; e.target.style.outline = '2px solid #fdd405'; e.target.style.outlineOffset = '2px'; }}
                                    onBlur={e => { e.target.style.borderColor = 'rgba(253,212,5,0.20)'; e.target.style.outline = 'none'; }}
                                />
                            </div>

                            {error && (
                                <p style={{ fontSize: 12, color: '#f87171', background: 'rgba(127,29,29,0.15)', border: '1px solid rgba(153,27,27,0.3)', borderRadius: 8, padding: '8px 12px' }}>
                                    {error}
                                </p>
                            )}
                            {info && !error && (
                                <p style={{ fontSize: 12, color: '#4ade80', background: 'rgba(20,83,45,0.15)', border: '1px solid rgba(22,101,52,0.3)', borderRadius: 8, padding: '8px 12px' }}>
                                    {info}
                                </p>
                            )}

                            <button type="submit" disabled={loading}
                                style={{
                                    width: '100%', padding: '13px', background: '#FDD405',
                                    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                                    color: '#111', cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.6 : 1,
                                    boxShadow: '0 4px 20px rgba(253,212,5,0.28)',
                                }}>
                                {loading
                                    ? <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                    : 'Confirm →'}
                            </button>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <button type="button" onClick={() => switchMode('signup')} disabled={loading}
                                    style={{ background: 'none', border: 'none', color: textSub, cursor: 'pointer', padding: 0 }}>
                                    ← Back
                                </button>
                                <button type="button" onClick={handleResend} disabled={loading}
                                    style={{ background: 'none', border: 'none', color: '#FDD405', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                                    Resend code
                                </button>
                            </div>
                        </form>
                    ) : mode === 'forgot' ? (
                        <form onSubmit={handleForgotSubmit} className="p-6 flex flex-col gap-4">
                            <p style={{ fontSize: 13, color: textSub }}>
                                Enter your account email and we'll send you a code to reset your password.
                            </p>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: labelColor }}>
                                    Email address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setError(''); }}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    autoFocus
                                    style={{
                                        width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                                        background: inputBg,
                                        border: '1px solid rgba(253,212,5,0.20)',
                                        borderRadius: 10, color: inputColor, fontSize: 14, outline: 'none',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = 'rgba(253,212,5,0.60)'; e.target.style.outline = '2px solid #fdd405'; e.target.style.outlineOffset = '2px'; }}
                                    onBlur={e => { e.target.style.borderColor = 'rgba(253,212,5,0.20)'; e.target.style.outline = 'none'; }}
                                />
                            </div>

                            {error && (
                                <p style={{ fontSize: 12, color: '#f87171', background: 'rgba(127,29,29,0.15)', border: '1px solid rgba(153,27,27,0.3)', borderRadius: 8, padding: '8px 12px' }}>
                                    {error}
                                </p>
                            )}
                            {info && !error && (
                                <p style={{ fontSize: 12, color: '#4ade80', background: 'rgba(20,83,45,0.15)', border: '1px solid rgba(22,101,52,0.3)', borderRadius: 8, padding: '8px 12px' }}>
                                    {info}
                                </p>
                            )}

                            <button type="submit" disabled={loading}
                                style={{
                                    width: '100%', padding: '13px', background: '#FDD405',
                                    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                                    color: '#111', cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.6 : 1,
                                    boxShadow: '0 4px 20px rgba(253,212,5,0.28)',
                                }}>
                                {loading
                                    ? <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                    : 'Send reset code →'}
                            </button>

                            <button type="button" onClick={() => switchMode('signin')} disabled={loading}
                                style={{ background: 'none', border: 'none', color: textSub, fontSize: 12, cursor: 'pointer', padding: 0, alignSelf: 'flex-start' }}>
                                ← Back to sign in
                            </button>
                        </form>
                    ) : mode === 'reset' ? (
                        <form onSubmit={handleResetSubmit} className="p-6 flex flex-col gap-4">
                            <p style={{ fontSize: 13, color: textSub }}>
                                Enter the code we emailed to <span style={{ color: textMain, fontWeight: 600 }}>{email}</span>, plus a new password.
                            </p>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: labelColor }}>
                                    Reset code
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={resetCode}
                                    onChange={e => { setResetCode(e.target.value); setError(''); }}
                                    placeholder="123456"
                                    autoComplete="one-time-code"
                                    autoFocus
                                    style={{
                                        width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                                        background: inputBg,
                                        border: '1px solid rgba(253,212,5,0.20)',
                                        borderRadius: 10, color: inputColor, fontSize: 14, outline: 'none', letterSpacing: 2,
                                    }}
                                    onFocus={e => { e.target.style.borderColor = 'rgba(253,212,5,0.60)'; e.target.style.outline = '2px solid #fdd405'; e.target.style.outlineOffset = '2px'; }}
                                    onBlur={e => { e.target.style.borderColor = 'rgba(253,212,5,0.20)'; e.target.style.outline = 'none'; }}
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: labelColor }}>
                                    New password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => { setNewPassword(e.target.value); setError(''); }}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    minLength={8}
                                    style={{
                                        width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                                        background: inputBg,
                                        border: '1px solid rgba(253,212,5,0.20)',
                                        borderRadius: 10, color: inputColor, fontSize: 14, outline: 'none',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = 'rgba(253,212,5,0.60)'; e.target.style.outline = '2px solid #fdd405'; e.target.style.outlineOffset = '2px'; }}
                                    onBlur={e => { e.target.style.borderColor = 'rgba(253,212,5,0.20)'; e.target.style.outline = 'none'; }}
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: labelColor }}>
                                    Confirm new password
                                </label>
                                <input
                                    type="password"
                                    value={confirmNewPassword}
                                    onChange={e => { setConfirmNewPassword(e.target.value); setError(''); }}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    minLength={8}
                                    style={{
                                        width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                                        background: inputBg,
                                        border: '1px solid rgba(253,212,5,0.20)',
                                        borderRadius: 10, color: inputColor, fontSize: 14, outline: 'none',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = 'rgba(253,212,5,0.60)'; e.target.style.outline = '2px solid #fdd405'; e.target.style.outlineOffset = '2px'; }}
                                    onBlur={e => { e.target.style.borderColor = 'rgba(253,212,5,0.20)'; e.target.style.outline = 'none'; }}
                                />
                            </div>

                            {error && (
                                <p style={{ fontSize: 12, color: '#f87171', background: 'rgba(127,29,29,0.15)', border: '1px solid rgba(153,27,27,0.3)', borderRadius: 8, padding: '8px 12px' }}>
                                    {error}
                                </p>
                            )}
                            {info && !error && (
                                <p style={{ fontSize: 12, color: '#4ade80', background: 'rgba(20,83,45,0.15)', border: '1px solid rgba(22,101,52,0.3)', borderRadius: 8, padding: '8px 12px' }}>
                                    {info}
                                </p>
                            )}

                            <button type="submit" disabled={loading}
                                style={{
                                    width: '100%', padding: '13px', background: '#FDD405',
                                    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                                    color: '#111', cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.6 : 1,
                                    boxShadow: '0 4px 20px rgba(253,212,5,0.28)',
                                }}>
                                {loading
                                    ? <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                    : 'Reset password →'}
                            </button>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <button type="button" onClick={() => switchMode('signin')} disabled={loading}
                                    style={{ background: 'none', border: 'none', color: textSub, cursor: 'pointer', padding: 0 }}>
                                    ← Back to sign in
                                </button>
                                <button type="button" onClick={handleForgotResend} disabled={loading}
                                    style={{ background: 'none', border: 'none', color: '#FDD405', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                                    Resend code
                                </button>
                            </div>
                        </form>
                    ) : (
                    <form onSubmit={handleContinue} className="p-6 flex flex-col gap-4">

                        {/* Full name — signup only */}
                        {mode === 'signup' && (
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: labelColor }}>
                                    Full name
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={e => { setFullName(e.target.value); setError(''); }}
                                    placeholder="Name"
                                    autoComplete="name"
                                    style={{
                                        width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                                        background: inputBg,
                                        border: '1px solid rgba(253,212,5,0.20)',
                                        borderRadius: 10, color: inputColor, fontSize: 14, outline: 'none',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = 'rgba(253,212,5,0.60)'; e.target.style.outline = '2px solid #fdd405'; e.target.style.outlineOffset = '2px'; }}
                                    onBlur={e => { e.target.style.borderColor = 'rgba(253,212,5,0.20)'; e.target.style.outline = 'none'; }}
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: labelColor }}>
                                Email address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setError(''); }}
                                placeholder="you@example.com"
                                autoComplete="email"
                                autoFocus
                                style={{
                                    width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                                    background: inputBg,
                                    border: '1px solid rgba(253,212,5,0.20)',
                                    borderRadius: 10, color: inputColor, fontSize: 14, outline: 'none',
                                }}
                                onFocus={e => { e.target.style.borderColor = 'rgba(253,212,5,0.60)'; e.target.style.outline = '2px solid #fdd405'; e.target.style.outlineOffset = '2px'; }}
                                onBlur={e => { e.target.style.borderColor = 'rgba(253,212,5,0.20)'; e.target.style.outline = 'none'; }}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: labelColor }}>
                                    Password
                                </label>
                                {mode === 'signin' && (
                                    <button type="button" onClick={() => switchMode('forgot')} disabled={loading}
                                        style={{ background: 'none', border: 'none', color: '#FDD405', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(''); }}
                                placeholder="••••••••"
                                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                minLength={mode === 'signup' ? 8 : undefined}
                                style={{
                                    width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                                    background: inputBg,
                                    border: '1px solid rgba(253,212,5,0.20)',
                                    borderRadius: 10, color: inputColor, fontSize: 14, outline: 'none',
                                }}
                                onFocus={e => { e.target.style.borderColor = 'rgba(253,212,5,0.60)'; e.target.style.outline = '2px solid #fdd405'; e.target.style.outlineOffset = '2px'; }}
                                onBlur={e => { e.target.style.borderColor = 'rgba(253,212,5,0.20)'; e.target.style.outline = 'none'; }}
                            />
                        </div>

                        {error && (
                            <p style={{ fontSize: 12, color: '#f87171', background: 'rgba(127,29,29,0.15)', border: '1px solid rgba(153,27,27,0.3)', borderRadius: 8, padding: '8px 12px' }}>
                                {error}
                            </p>
                        )}
                        {info && !error && (
                            <p style={{ fontSize: 12, color: '#4ade80', background: 'rgba(20,83,45,0.15)', border: '1px solid rgba(22,101,52,0.3)', borderRadius: 8, padding: '8px 12px' }}>
                                {info}
                            </p>
                        )}

                        {/* Continue */}
                        <button type="submit" disabled={loading}
                            style={{
                                width: '100%', padding: '13px', background: '#FDD405',
                                border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                                color: '#111', cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1,
                                boxShadow: '0 4px 20px rgba(253,212,5,0.28)',
                            }}>
                            {loading
                                ? <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                : (mode === 'signup' ? 'Create account →' : 'Continue →')}
                        </button>

                        {/* Divider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ flex: 1, height: 1, background: dividerBg }} />
                            <span style={{ fontSize: 11, color: orColor }}>or</span>
                            <div style={{ flex: 1, height: 1, background: dividerBg }} />
                        </div>

                        {/* Google */}
                        <button type="button" onClick={handleGoogle} disabled={loading}
                            style={{
                                width: '100%', padding: '12px', background: googleBg,
                                border: isDark ? 'none' : '1px solid rgba(0,0,0,0.10)',
                                borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                                color: '#1a1a1a', cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                opacity: loading ? 0.6 : 1,
                            }}>
                            <GoogleIcon />
                            Continue with Google
                        </button>

                        {/* Checkbox */}
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                            <div onClick={() => setUpdates(v => !v)} style={{
                                width: 17, height: 17, borderRadius: 5, flexShrink: 0, marginTop: 2, cursor: 'pointer',
                                background: updates ? '#FDD405' : 'transparent',
                                border: updates ? 'none' : `1.5px solid ${isDark ? '#52525b' : '#a1a1aa'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {updates && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            <span style={{ fontSize: 12, color: textSub, lineHeight: 1.6 }}>
                                Get updates from 72 Street on SMS &amp; WhatsApp
                            </span>
                        </label>
                    </form>
                    )}
                </div>

                {/* Terms */}
                <p style={{ textAlign: 'center', fontSize: 11, color: labelColor, marginTop: 16, lineHeight: 1.7 }}>
                    {/* QA-C-007: at 11px these anchors were ~15px tall — below the 24px
                        minimum target size (WCAG 2.2 SC 2.5.8), which makes them hard to
                        hit on a phone. inline-block + vertical padding grows the HIT AREA
                        to 24px without changing the type size or the visual layout. */}
                    By continuing you agree to our{' '}
                    <a href="/terms" target="_blank" rel="noopener noreferrer"
                       style={{ color: textSub, textDecoration: 'underline', cursor: 'pointer',
                                display: 'inline-block', paddingBlock: 5 }}>Terms of Service</a>
                    {' '}and{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer"
                       style={{ color: textSub, textDecoration: 'underline', cursor: 'pointer',
                                display: 'inline-block', paddingBlock: 5 }}>Privacy Policy</a>
                </p>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 24, opacity: 0.55 }}>
                    <span style={{ fontSize: 11, color: textSub }}>Powered by</span>
                    <span className="brand-display" style={{ fontSize: 12, fontWeight: 700, color: '#FDD405', letterSpacing: '0.14em' }}>72 STREET</span>
                </div>
            </motion.main>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
