import { FormInput, AuthAlerts, SubmitButton, PasswordRules } from './shared';

// 'reset' mode: enter the emailed reset code plus a new password.
export default function ResetForm({
    email, resetCode, setResetCode, newPassword, setNewPassword,
    confirmNewPassword, setConfirmNewPassword,
    showNewPassword, setShowNewPassword, showConfirmNewPassword, setShowConfirmNewPassword,
    setError, error, info, loading,
    onSubmit, onBack, onResend, textSub, textMain, labelColor, inputBg, inputColor,
}) {
    return (
        <form onSubmit={onSubmit} className="p-6 flex flex-col gap-4">
            <p style={{ fontSize: 13, color: textSub }}>
                Enter the code we emailed to <span style={{ color: textMain, fontWeight: 600 }}>{email}</span>, plus a new password.
                {' '}Don't see it? Check your spam/junk folder.
            </p>

            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: labelColor }}>
                    Reset code
                </label>
                <FormInput
                    type="text"
                    inputMode="numeric"
                    value={resetCode}
                    onChange={e => { setResetCode(e.target.value); setError(''); }}
                    placeholder="123456"
                    autoComplete="one-time-code"
                    autoFocus
                    letterSpaced
                    inputBg={inputBg}
                    inputColor={inputColor}
                />
            </div>

            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: labelColor }}>
                    New password
                </label>
                <FormInput
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    minLength={8}
                    inputBg={inputBg}
                    inputColor={inputColor}
                    labelColor={labelColor}
                    toggle={{ show: showNewPassword, onToggle: () => setShowNewPassword(v => !v) }}
                />
                {/* Same policy is enforced on reset (AuthPage.jsx validates with
                    validatePassword here too), so the rules belong here as well. */}
                <PasswordRules password={newPassword} subtleColor={labelColor} />
            </div>

            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: labelColor }}>
                    Confirm new password
                </label>
                <FormInput
                    value={confirmNewPassword}
                    onChange={e => { setConfirmNewPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    minLength={8}
                    inputBg={inputBg}
                    inputColor={inputColor}
                    labelColor={labelColor}
                    toggle={{ show: showConfirmNewPassword, onToggle: () => setShowConfirmNewPassword(v => !v) }}
                />
            </div>

            <AuthAlerts error={error} info={info} />

            <SubmitButton loading={loading} label="Reset password →" />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <button type="button" onClick={onBack} disabled={loading}
                    style={{ background: 'none', border: 'none', color: textSub, cursor: 'pointer', padding: 0 }}>
                    ← Back to sign in
                </button>
                <button type="button" onClick={onResend} disabled={loading}
                    style={{ background: 'none', border: 'none', color: '#FDD405', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    Resend code
                </button>
            </div>
        </form>
    );
}
