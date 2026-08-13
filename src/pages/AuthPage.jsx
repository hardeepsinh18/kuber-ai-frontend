import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import KuberLogo from '../components/KuberLogo';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';
import useSkipHeavyBackdrop from '../hooks/useSkipHeavyBackdrop';
import { postSubscribe, isValidEmail, validatePassword } from './AuthPage/authHelpers';
import ConfirmForm from './AuthPage/ConfirmForm';
import ForgotForm from './AuthPage/ForgotForm';
import ResetForm from './AuthPage/ResetForm';
import SignInUpForm from './AuthPage/SignInUpForm';

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
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
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
        if (!isValidEmail(email.trim())) { setError('Please enter a valid email'); return; }
        if (!password) { setError('Please enter your password'); return; }
        if (mode === 'signup' && !validatePassword(password)) {
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
        if (!isValidEmail(email.trim())) { setError('Please enter a valid email'); return; }
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
        if (!validatePassword(newPassword)) {
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
                        <ConfirmForm
                            email={email} confirmCode={confirmCode} setConfirmCode={setConfirmCode}
                            setError={setError} error={error} info={info} loading={loading}
                            onSubmit={handleConfirm} onBack={() => switchMode('signup')} onResend={handleResend}
                            textSub={textSub} textMain={textMain} labelColor={labelColor}
                            inputBg={inputBg} inputColor={inputColor}
                        />
                    ) : mode === 'forgot' ? (
                        <ForgotForm
                            email={email} setEmail={setEmail} setError={setError} error={error} info={info} loading={loading}
                            onSubmit={handleForgotSubmit} onBack={() => switchMode('signin')}
                            textSub={textSub} labelColor={labelColor} inputBg={inputBg} inputColor={inputColor}
                        />
                    ) : mode === 'reset' ? (
                        <ResetForm
                            email={email} resetCode={resetCode} setResetCode={setResetCode}
                            newPassword={newPassword} setNewPassword={setNewPassword}
                            confirmNewPassword={confirmNewPassword} setConfirmNewPassword={setConfirmNewPassword}
                            showNewPassword={showNewPassword} setShowNewPassword={setShowNewPassword}
                            showConfirmNewPassword={showConfirmNewPassword} setShowConfirmNewPassword={setShowConfirmNewPassword}
                            setError={setError} error={error} info={info} loading={loading}
                            onSubmit={handleResetSubmit} onBack={() => switchMode('signin')} onResend={handleForgotResend}
                            textSub={textSub} textMain={textMain} labelColor={labelColor}
                            inputBg={inputBg} inputColor={inputColor}
                        />
                    ) : (
                        <SignInUpForm
                            mode={mode} fullName={fullName} setFullName={setFullName}
                            email={email} setEmail={setEmail} password={password} setPassword={setPassword}
                            showPassword={showPassword} setShowPassword={setShowPassword}
                            setError={setError} error={error} info={info} loading={loading}
                            updates={updates} setUpdates={setUpdates}
                            onSubmit={handleContinue} onForgot={() => switchMode('forgot')} onGoogle={handleGoogle}
                            textSub={textSub} labelColor={labelColor} inputBg={inputBg} inputColor={inputColor}
                            dividerBg={dividerBg} orColor={orColor} googleBg={googleBg} isDark={isDark}
                        />
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
