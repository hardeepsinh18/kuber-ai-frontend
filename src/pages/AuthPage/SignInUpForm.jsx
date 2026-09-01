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
        // VNTY-023: native browser validation (type="email") ran its own constraint
        // check and blocked submission BEFORE onSubmit ever fired, so a malformed
        // email fell through to the browser's own validation bubble instead of the
        // same in-app error styling every other case here uses. noValidate hands
        // format checking entirely to the isValidEmail check already in onSubmit.
        <form onSubmit={onSubmit} noValidate className="p-6 flex flex-col gap-4">

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
            <div style={{ position: 'relative' }}>
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: labelColor }}>
                    Password
                </label>
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
                {/* VNTY-020: this used to sit in the same row as the "Password" label,
                    ABOVE the input in DOM order — so Tab went Email -> Forgot password ->
                    Password, skipping the field the user was trying to reach. Placed AFTER
                    the input in DOM (so it tabs correctly, right after Password) and
                    absolutely positioned back into its original visual spot, top-right next
                    to the label. */}
                {mode === 'signin' && (
                    <button type="button" onClick={onForgot} disabled={loading}
                        style={{
                            position: 'absolute', top: 0, right: 0,
                            background: 'none', border: 'none', color: '#FDD405', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0,
                        }}>
                        Forgot password?
                    </button>
                )}
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

            {/* Checkbox — signup only (VNTY-024): marketing consent belongs where an
                account is actually being created, not on Sign in where nothing is
                being opted into. */}
            {mode === 'signup' && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                    {/* VNTY-014: a styled <div onClick> is invisible to the keyboard and
                        gives the whole row no real toggle target — only the 17px square
                        itself did anything, and Tab could never reach it. A real
                        <input type="checkbox"> wrapped in this <label> restores both:
                        clicking the label text toggles it (native behavior) and it's a
                        normal Tab stop. accent-color keeps the brand colour without
                        losing native checkbox semantics. */}
                    <input
                        type="checkbox"
                        checked={updates}
                        onChange={() => setUpdates(v => !v)}
                        style={{
                            width: 17, height: 17, flexShrink: 0, marginTop: 2, cursor: 'pointer',
                            accentColor: '#FDD405',
                        }}
                    />
                    <span style={{ fontSize: 12, color: textSub, lineHeight: 1.6 }}>
                        Get updates from 72 Street on SMS &amp; WhatsApp
                    </span>
                </label>
            )}
        </form>
    );
}
