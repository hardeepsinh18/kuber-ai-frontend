import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const GoogleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

const Field = ({ label, icon: Icon, type: initialType, value, onChange, placeholder, required, minLength }) => {
    const [showPw, setShowPw] = useState(false);
    const isPw = initialType === 'password';
    const type = isPw && showPw ? 'text' : initialType;

    return (
        <div className="group">
            <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase
                               text-zinc-500 dark:text-zinc-500 mb-1.5">
                {label}
            </label>
            <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none
                                text-zinc-500 dark:text-zinc-600
                                group-focus-within:text-[#FDD405] transition-colors duration-200">
                    <Icon size={13} strokeWidth={2} />
                </div>
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    minLength={minLength}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl
                               bg-zinc-100/80 dark:bg-zinc-800/50
                               border border-zinc-200/80 dark:border-zinc-700/50
                               text-[13.5px] text-zinc-900 dark:text-zinc-100
                               placeholder:text-zinc-400 dark:placeholder:text-zinc-600
                               focus:outline-none
                               focus:border-[#FDD405]/80 dark:focus:border-[#FDD405]/60
                               focus:ring-2 focus:ring-amber-400/[0.12] dark:focus:ring-amber-500/[0.10]
                               focus:bg-white dark:focus:bg-zinc-800/80
                               transition-all duration-200"
                />
                {isPw && (
                    <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); setShowPw(v => !v); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2
                                   text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400
                                   transition-colors duration-150">
                        {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                )}
            </div>
        </div>
    );
};

const LoginModal = ({ isOpen, onClose }) => {
    const { signInWithEmail, signUpWithEmail, signInWithGoogle, supabaseConfigured } = useAuth();
    const [mode, setMode]         = useState('signin');
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError]       = useState('');
    const [success, setSuccess]   = useState('');
    const [loading, setLoading]   = useState(false);
    const triggerRef              = useRef(null);

    useEffect(() => {
        if (isOpen) triggerRef.current = document.activeElement;
        else { triggerRef.current?.focus(); triggerRef.current = null; }
    }, [isOpen]);

    const switchMode = (m) => { setMode(m); setError(''); setSuccess(''); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccess(''); setLoading(true);
        try {
            if (mode === 'signin') {
                await signInWithEmail(email, password);
                onClose();
            } else {
                await signUpWithEmail(email, password, { full_name: fullName });
                setSuccess('Check your email to confirm your account.');
            }
        } catch (err) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setError(''); setLoading(true);
        try {
            const { data, error: err } = await signInWithGoogle();
            if (err) throw err;
            if (data?.url) { window.location.href = data.url; return; }
            onClose();
        } catch (err) {
            setError(err.message || 'Google sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    if (!supabaseConfigured) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm mx-4
                                border border-zinc-200 dark:border-zinc-800">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Sign-in is not available in this environment. You can continue as a guest.
                    </p>
                    <button onClick={onClose}
                        className="mt-4 w-full py-2.5 rounded-xl bg-[#FDD405] hover:bg-[#FDD405] text-black font-semibold transition-colors">
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 z-50 flex items-center justify-center px-4"
                    style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>

                    <div className="absolute inset-0" onClick={onClose} />

                    <motion.div
                        key="modal"
                        initial={{ opacity: 0, scale: 0.94, y: 20 }}
                        animate={{ opacity: 1, scale: 1,    y: 0  }}
                        exit={{    opacity: 0, scale: 0.94, y: 20 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="relative w-full max-w-[400px] rounded-2xl overflow-hidden
                                   bg-white dark:bg-[#0C0900]
                                   border border-zinc-200/70 dark:border-zinc-800/80
                                   shadow-[0_32px_100px_rgba(0,0,0,0.6),0_0_0_1px_rgba(253,212,5,0.08)]"
                        onClick={e => e.stopPropagation()}>

                        {/* Top amber gradient accent */}
                        <div style={{ height: 3, background: 'linear-gradient(90deg, transparent 0%, #FDD405 30%, #FDD405 70%, transparent 100%)', opacity: 0.9 }} />

                        {/* Subtle inner glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24
                                        blur-2xl pointer-events-none rounded-full"
                             style={{ backgroundColor: 'rgba(253,212,5,0.06)' }} />

                        {/* ── Header ── */}
                        <div className="flex items-center justify-between px-6 pt-5 pb-0">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="absolute inset-0 rounded-xl bg-amber-500/25 blur-md" />
                                    <div className="relative w-9 h-9 rounded-xl flex items-center justify-center
                                                    bg-gradient-to-br from-[#FDD405] to-amber-600
                                                    shadow-[0_2px_14px_rgba(253,212,5,0.45)]">
                                        <span className="text-black font-black text-base leading-none">K</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[14px] font-bold text-zinc-900 dark:text-white leading-none">KuberAI</p>
                                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5 tracking-wide">by 72Street</p>
                                </div>
                            </div>
                            <button onClick={onClose}
                                className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-600
                                           hover:bg-zinc-100 dark:hover:bg-zinc-800/70
                                           hover:text-zinc-600 dark:hover:text-zinc-300
                                           transition-colors duration-150">
                                <X size={16} />
                            </button>
                        </div>

                        {/* ── Tab switcher ── */}
                        <div className="flex mx-6 mt-5 p-[3px] rounded-xl
                                        bg-zinc-100/80 dark:bg-zinc-800/40
                                        border border-zinc-200/60 dark:border-zinc-700/30">
                            {['signin', 'signup'].map(m => (
                                <button key={m} type="button"
                                    onMouseDown={e => { e.preventDefault(); switchMode(m); }}
                                    className={`flex-1 py-2 rounded-[9px] text-[12.5px] font-semibold
                                                transition-all duration-200 select-none
                                                ${mode === m
                                                    ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-[#FDD405] shadow-sm border border-zinc-200/60 dark:border-zinc-700/40'
                                                    : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400'
                                                }`}>
                                    {m === 'signin' ? 'Sign in' : 'Create account'}
                                </button>
                            ))}
                        </div>

                        {/* ── Form ── */}
                        <form onSubmit={handleSubmit} className="px-6 pt-4 pb-6 space-y-3">

                            {error && (
                                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                    className="text-[12px] text-red-600 dark:text-red-400
                                               bg-red-50 dark:bg-red-950/25
                                               border border-red-200/60 dark:border-red-800/30
                                               px-3 py-2 rounded-lg">
                                    {error}
                                </motion.div>
                            )}
                            {success && (
                                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                    className="text-[12px] text-emerald-700 dark:text-emerald-400
                                               bg-emerald-50 dark:bg-emerald-950/25
                                               border border-emerald-200/60 dark:border-emerald-800/30
                                               px-3 py-2 rounded-lg">
                                    {success}
                                </motion.div>
                            )}

                            <AnimatePresence mode="wait">
                                {mode === 'signup' && (
                                    <motion.div key="name"
                                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.22 }}>
                                        <Field label="Full name" icon={User} type="text"
                                            value={fullName} onChange={e => setFullName(e.target.value)}
                                            placeholder="John Doe" />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <Field label="Email" icon={Mail} type="email"
                                value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com" required />

                            <Field label="Password" icon={Lock} type="password"
                                value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••" required minLength={6} />

                            {/* Submit */}
                            <button type="submit" disabled={loading}
                                className="group w-full py-3 rounded-xl mt-1
                                           bg-gradient-to-r from-[#FDD405] to-[#FDD405]
                                           hover:from-[#FDD405] hover:to-[#FDD405]/80
                                           text-black font-bold text-[13.5px]
                                           shadow-[0_2px_20px_rgba(253,212,5,0.42)]
                                           hover:shadow-[0_4px_30px_rgba(253,212,5,0.60)]
                                           disabled:opacity-40 disabled:cursor-not-allowed
                                           hover:scale-[1.015] active:scale-[0.985]
                                           disabled:hover:scale-100
                                           transition-all duration-150
                                           flex items-center justify-center gap-2">
                                {loading
                                    ? <span className="w-4 h-4 border-2 border-black/25 border-t-black/80 rounded-full animate-spin" />
                                    : <>
                                        {mode === 'signin' ? 'Sign in' : 'Create account'}
                                        <ArrowRight size={14} strokeWidth={2.5}
                                            className="transition-transform duration-150 group-hover:translate-x-0.5" />
                                    </>
                                }
                            </button>

                            {/* Divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-zinc-200/80 dark:bg-zinc-800/70" />
                                <span className="text-[11px] text-zinc-400 dark:text-zinc-600 font-medium">or</span>
                                <div className="flex-1 h-px bg-zinc-200/80 dark:bg-zinc-800/70" />
                            </div>

                            {/* Google */}
                            <button type="button" onClick={handleGoogle} disabled={loading}
                                className="w-full py-2.5 rounded-xl
                                           bg-white dark:bg-zinc-800/50
                                           border border-zinc-200/80 dark:border-zinc-700/50
                                           hover:bg-zinc-50 dark:hover:bg-zinc-800
                                           text-zinc-700 dark:text-zinc-300
                                           font-semibold text-[13px]
                                           disabled:opacity-40 disabled:cursor-not-allowed
                                           transition-all duration-150
                                           flex items-center justify-center gap-2.5
                                           shadow-sm hover:shadow">
                                <GoogleIcon />
                                Continue with Google
                            </button>

                            {/* Switch mode */}
                            <p className="text-center text-[11.5px] text-zinc-500 dark:text-zinc-600">
                                {mode === 'signin'
                                    ? <>No account?{' '}
                                        <button type="button"
                                            onMouseDown={e => { e.preventDefault(); switchMode('signup'); }}
                                            className="text-amber-600 dark:text-[#FDD405] font-bold hover:underline">
                                            Sign up free
                                        </button>
                                    </>
                                    : <>Already have an account?{' '}
                                        <button type="button"
                                            onMouseDown={e => { e.preventDefault(); switchMode('signin'); }}
                                            className="text-amber-600 dark:text-[#FDD405] font-bold hover:underline">
                                            Sign in
                                        </button>
                                    </>
                                }
                            </p>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LoginModal;
