import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import KuberLogo from '../components/KuberLogo';

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
    const { signInWithEmail, signInWithGoogle, isAuthenticated, supabaseConfigured } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [updates,  setUpdates]  = useState(true);
    const [error,   setError]   = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) navigate('/', { replace: true });
    }, [isAuthenticated, navigate]);

    const handleContinue = async (e) => {
        e.preventDefault();
        if (!email.trim()) { setError('Please enter your email address'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email'); return; }
        if (!password) { setError('Please enter your password'); return; }
        setError(''); setLoading(true);
        try {
            // QA-C-001: real Cognito email+password sign-in — no phone-as-password,
            // no hardcoded 'demo1234' fallback.
            await signInWithEmail(email.trim(), password);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.message || 'Something went wrong');
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

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden"
             style={{ backgroundColor: bg }}>

            {/* Background video */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0" style={{ backgroundColor: bg }} />
                <video
                    key={theme}
                    src={isDark ? '/bg-dark.mp4' : '/bg-light.mp4'}
                    autoPlay loop muted playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: isDark ? 0.40 : 0.55 }}
                />
                <div className="absolute inset-0" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(245,242,232,0.30)' }} />
            </div>

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-sm flex flex-col items-center">

                {/* Logo */}
                <div className="flex items-center gap-3 mb-6">
                    <KuberLogo size={36} className="text-[#FDD405]" />
                    <div>
                        <p className="text-[18px] font-black leading-none tracking-tight" style={{ color: textMain }}>KUBER AI</p>
                        <p className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: labelColor }}>by 72 Street</p>
                    </div>
                </div>

                {/* Heading */}
                <h1 className="text-[24px] font-bold text-center leading-snug mb-1" style={{ color: textMain }}>
                    Hi! I'm <span style={{ color: '#FDD405' }}>Kuber AI</span>
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

                    <form onSubmit={handleContinue} className="p-6 flex flex-col gap-4">

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
                                onFocus={e => e.target.style.borderColor = 'rgba(253,212,5,0.60)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(253,212,5,0.20)'}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: labelColor }}>
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(''); }}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                style={{
                                    width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                                    background: inputBg,
                                    border: '1px solid rgba(253,212,5,0.20)',
                                    borderRadius: 10, color: inputColor, fontSize: 14, outline: 'none',
                                }}
                                onFocus={e => e.target.style.borderColor = 'rgba(253,212,5,0.60)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(253,212,5,0.20)'}
                            />
                        </div>

                        {error && (
                            <p style={{ fontSize: 12, color: '#f87171', background: 'rgba(127,29,29,0.15)', border: '1px solid rgba(153,27,27,0.3)', borderRadius: 8, padding: '8px 12px' }}>
                                {error}
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
                                : 'Continue →'}
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
                            Sign up with Google
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
                </div>

                {/* Terms */}
                <p style={{ textAlign: 'center', fontSize: 11, color: labelColor, marginTop: 16, lineHeight: 1.7 }}>
                    By continuing you agree to our{' '}
                    <a href="/terms" target="_blank" rel="noopener noreferrer"
                       style={{ color: textSub, textDecoration: 'underline', cursor: 'pointer' }}>Terms of Service</a>
                    {' '}and{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer"
                       style={{ color: textSub, textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</a>
                </p>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, opacity: 0.5 }}>
                    <span style={{ fontSize: 11, color: textSub }}>Powered by</span>
                    <KuberLogo size={13} className="text-[#FDD405]" />
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#FDD405', letterSpacing: '0.15em' }}>72 STREET</span>
                </div>
            </motion.div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
