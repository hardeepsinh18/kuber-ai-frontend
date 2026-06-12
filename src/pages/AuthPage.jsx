import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
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

    const [email,   setEmail]   = useState('');
    const [phone,   setPhone]   = useState('');
    const [updates, setUpdates] = useState(true);
    const [error,   setError]   = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) navigate('/', { replace: true });
    }, [isAuthenticated, navigate]);

    const handleContinue = async (e) => {
        e.preventDefault();
        if (!email.trim()) { setError('Please enter your email address'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email'); return; }
        setError(''); setLoading(true);
        try {
            await signInWithEmail(email.trim(), phone || 'demo1234');
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.message || 'Something went wrong');
        } finally { setLoading(false); }
    };

    const handleGoogle = async () => {
        setLoading(true);
        try {
            if (!supabaseConfigured) {
                await signInWithEmail('google.user@gmail.com', 'demo1234');
                navigate('/', { replace: true });
                return;
            }
            const r = await signInWithGoogle();
            if (r?.url) { window.location.href = r.url; return; }
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.message || 'Google sign-in failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0A0A0A] px-4 py-10 relative overflow-hidden">

            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[#0A0A0A]" />
                <video src="/bg-dark.mp4" autoPlay loop muted playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-40" />
                <div className="absolute inset-0 bg-black/25" />
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
                        <p className="text-[18px] font-black text-white leading-none tracking-tight">KUBER AI</p>
                        <p className="text-[10px] text-zinc-500 tracking-widest uppercase mt-0.5">by 72 Street</p>
                    </div>
                </div>

                {/* Heading */}
                <h1 className="text-[24px] font-bold text-white text-center leading-snug mb-1">
                    Hi! I'm <span style={{ color: '#FDD405' }}>Kuber AI</span>
                </h1>
                <p className="text-zinc-400 text-[13px] text-center mb-7">I bring clarity to market decisions.</p>

                {/* Card */}
                <div className="w-full rounded-2xl overflow-hidden"
                    style={{
                        background: 'rgba(14,11,1,0.90)',
                        border: '1px solid rgba(253,212,5,0.18)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                    }}>

                    <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, #FDD405 40%, #FDD405 60%, transparent)' }} />

                    <form onSubmit={handleContinue} className="p-6 flex flex-col gap-4">

                        {/* Email */}
                        <div>
                            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
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
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(253,212,5,0.20)',
                                    borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none',
                                }}
                                onFocus={e => e.target.style.borderColor = 'rgba(253,212,5,0.60)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(253,212,5,0.20)'}
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
                                Phone <span className="normal-case font-normal text-zinc-700">(optional)</span>
                            </label>
                            <div style={{
                                display: 'flex', alignItems: 'center',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(253,212,5,0.20)',
                                borderRadius: 10, overflow: 'hidden',
                            }}
                                onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(253,212,5,0.60)'}
                                onBlurCapture={e => e.currentTarget.style.borderColor = 'rgba(253,212,5,0.20)'}>
                                <span style={{ padding: '11px 10px 11px 14px', fontSize: 14, color: '#71717a', borderRight: '1px solid rgba(253,212,5,0.12)', flexShrink: 0 }}>+91</span>
                                <input type="tel" value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    placeholder="98765 43210"
                                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14, padding: '11px 14px' }}
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-[12px] text-red-400 bg-red-950/20 border border-red-800/30 px-3 py-2 rounded-lg">
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
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-white/[0.07]" />
                            <span className="text-[11px] text-zinc-600">or</span>
                            <div className="flex-1 h-px bg-white/[0.07]" />
                        </div>

                        {/* Google */}
                        <button type="button" onClick={handleGoogle} disabled={loading}
                            style={{
                                width: '100%', padding: '12px', background: '#fff',
                                border: 'none', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                                color: '#1a1a1a', cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                opacity: loading ? 0.6 : 1,
                            }}>
                            <GoogleIcon />
                            Sign up with Google
                        </button>

                        {/* Checkbox */}
                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                            <div onClick={() => setUpdates(v => !v)} style={{
                                width: 17, height: 17, borderRadius: 5, flexShrink: 0, marginTop: 2, cursor: 'pointer',
                                background: updates ? '#FDD405' : 'transparent',
                                border: updates ? 'none' : '1.5px solid #52525b',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {updates && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            <span className="text-[12px] text-zinc-500 leading-relaxed">
                                Get updates from 72 Street on SMS &amp; WhatsApp
                            </span>
                        </label>
                    </form>
                </div>

                {/* Terms */}
                <p className="text-center text-[11px] text-zinc-600 mt-4 leading-relaxed">
                    By continuing you agree to our{' '}
                    <span className="text-zinc-500 underline cursor-pointer">Terms of Service</span>
                    {' '}and{' '}
                    <span className="text-zinc-500 underline cursor-pointer">Privacy Policy</span>
                </p>

                {/* Footer */}
                <div className="flex items-center gap-2 mt-6 opacity-50">
                    <span className="text-[11px] text-zinc-500">Powered by</span>
                    <KuberLogo size={13} className="text-[#FDD405]" />
                    <span className="text-[11px] font-black text-[#FDD405] tracking-widest">72 STREET</span>
                </div>
            </motion.div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
