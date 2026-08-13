import { FormInput, AuthAlerts, SubmitButton } from './shared';

// 'forgot' mode: enter email to request a reset code.
export default function ForgotForm({
    email, setEmail, setError, error, info, loading,
    onSubmit, onBack, textSub, labelColor, inputBg, inputColor,
}) {
    return (
        <form onSubmit={onSubmit} className="p-6 flex flex-col gap-4">
            <p style={{ fontSize: 13, color: textSub }}>
                Enter your account email and we'll send you a code to reset your password.
            </p>

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

            <AuthAlerts error={error} info={info} />

            <SubmitButton loading={loading} label="Send reset code →" />

            <button type="button" onClick={onBack} disabled={loading}
                style={{ background: 'none', border: 'none', color: textSub, fontSize: 12, cursor: 'pointer', padding: 0, alignSelf: 'flex-start' }}>
                ← Back to sign in
            </button>
        </form>
    );
}
