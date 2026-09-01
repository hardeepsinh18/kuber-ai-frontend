import { useState } from 'react';
import { FormInput, AuthAlerts, SubmitButton, GoogleIcon, PasswordRules } from './shared';
import { validatePassword } from './authHelpers';

// 'signin' / 'signup' mode: email + password, plus full name and the marketing
// consent checkbox when signing up.
export default function SignInUpForm({
    mode, fullName, setFullName, email, setEmail, password, setPassword,
    showPassword, setShowPassword, setError, error, info, loading,
    updates, setUpdates, onSubmit, onForgot, onGoogle,
    textSub, labelColor, inputBg, inputColor, dividerBg, orColor, googleBg, isDark,
}) {
    // The checklist appears when the user reaches the field, not before — an
    // untouched signup form should not open with a wall of requirements. It then
    // STAYS while anything is unmet, so tabbing away mid-entry does not hide the
    // thing being worked towards.
    const [pwFocused, setPwFocused] = useState(false);
    const showRules = mode === 'signup' && (pwFocused || (password && !validatePassword(password)));

    return (
        <form onSubmit={onSubmit} className="p-6 flex flex-col gap-4">

            {/* Full name — signup only */}
            {mode === 'signup' && (
                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: labelColor }}>
                        Full name
                    </label>
                    <FormInput
                        type="text"
                        value={fullName}
                        onChange={e => { setFullName(e.target.value); setError(''); }}
                        placeholder="Name"
                        autoComplete="name"
                        inputBg={inputBg}
                        inputColor={inputColor}
                    />
                </div>
            )}

            {/* Email */}
            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: labelColor }}>
                    Email address
                </label>
                <FormInput
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    inputBg={inputBg}
                    inputColor={inputColor}
                />
            </div>

            {/* Password */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: labelColor }}>
                        Password
                    </label>
                    {mode === 'signin' && (
                        <button type="button" onClick={onForgot} disabled={loading}
                            style={{ background: 'none', border: 'none', color: '#FDD405', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                            Forgot password?
                        </button>
                    )}
                </div>
                <FormInput
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    minLength={mode === 'signup' ? 8 : undefined}
                    inputBg={inputBg}
                    inputColor={inputColor}
                    labelColor={labelColor}
                    onFocus={() => setPwFocused(true)}
                    onBlur={() => setPwFocused(false)}
                    toggle={{ show: showPassword, onToggle: () => setShowPassword(v => !v) }}
                />
                {/* Signup only. On sign-in the account already exists, so listing
                    the policy there would be noise — and worse, it would hint at
                    the composition of an existing password. */}
                {mode === 'signup' && (
                    <PasswordRules password={password} visible={!!showRules} subtleColor={labelColor} />
                )}
            </div>

            <AuthAlerts error={error} info={info} />

            {/* Continue */}
            <SubmitButton loading={loading} label={mode === 'signup' ? 'Create account →' : 'Continue →'} />

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: dividerBg }} />
                <span style={{ fontSize: 11, color: orColor }}>or</span>
                <div style={{ flex: 1, height: 1, background: dividerBg }} />
            </div>

            {/* Google */}
            <button type="button" onClick={onGoogle} disabled={loading}
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
    );
}
