import { FormInput, AuthAlerts, SubmitButton } from './shared';

// 'confirm' mode: enter the emailed code after signup.
export default function ConfirmForm({
    email, confirmCode, setConfirmCode, setError, error, info, loading,
    onSubmit, onBack, onResend, textSub, textMain, labelColor, inputBg, inputColor,
}) {
    return (
        <form onSubmit={onSubmit} className="p-6 flex flex-col gap-4">
            <p style={{ fontSize: 13, color: textSub }}>
                Enter the code we emailed to <span style={{ color: textMain, fontWeight: 600 }}>{email}</span>.
            </p>

            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: labelColor }}>
                    Confirmation code
                </label>
                <FormInput
                    type="text"
                    inputMode="numeric"
                    value={confirmCode}
                    onChange={e => { setConfirmCode(e.target.value); setError(''); }}
                    placeholder="123456"
                    autoComplete="one-time-code"
                    autoFocus
                    letterSpaced
                    inputBg={inputBg}
                    inputColor={inputColor}
                />
            </div>

            <AuthAlerts error={error} info={info} />

            <SubmitButton loading={loading} label="Confirm →" />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <button type="button" onClick={onBack} disabled={loading}
                    style={{ background: 'none', border: 'none', color: textSub, cursor: 'pointer', padding: 0 }}>
                    ← Back
                </button>
                <button type="button" onClick={onResend} disabled={loading}
                    style={{ background: 'none', border: 'none', color: '#FDD405', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    Resend code
                </button>
            </div>
        </form>
    );
}
