import { Eye, EyeOff, Check, Circle } from 'lucide-react';
import { PASSWORD_RULES } from './authHelpers';

export const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

// Absolutely-positioned eye/eye-off toggle sitting inside a password input's
// wrapper (which must be `position: relative`). tabIndex -1 so Tab skips
// straight from the password field to the next control.
const PasswordToggle = ({ show, onToggle, subtleColor }) => (
    <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
        style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', padding: 4, cursor: 'pointer',
            display: 'flex', color: subtleColor,
        }}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
);

// Shared text input used across every AuthPage form mode (signin/signup, confirm,
// forgot, reset) — same box styles + focus/blur ring on all of them. `letterSpaced`
// covers the two numeric-code fields (confirm/reset). `toggle` (an optional
// { show, onToggle } pair) covers the three password fields: it swaps the input
// type, pads right to clear the eye icon, and renders <PasswordToggle>.
export const FormInput = ({
    type = 'text', inputMode, value, onChange, placeholder, autoComplete,
    autoFocus, minLength, letterSpaced, inputBg, inputColor, labelColor, toggle,
    onFocus, onBlur,
}) => {
    const input = (
        <input
            type={toggle ? (toggle.show ? 'text' : 'password') : type}
            inputMode={inputMode}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            minLength={minLength}
            style={{
                width: '100%', padding: toggle ? '11px 40px 11px 14px' : '11px 14px', boxSizing: 'border-box',
                background: inputBg,
                border: '1px solid rgba(253,212,5,0.20)',
                borderRadius: 10, color: inputColor, fontSize: 14, outline: 'none',
                ...(letterSpaced ? { letterSpacing: 2 } : null),
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(253,212,5,0.60)'; e.target.style.outline = '2px solid #fdd405'; e.target.style.outlineOffset = '2px'; onFocus?.(e); }}
            onBlur={e => { e.target.style.borderColor = 'rgba(253,212,5,0.20)'; e.target.style.outline = 'none'; onBlur?.(e); }}
        />
    );
    if (!toggle) return input;
    return (
        <div style={{ position: 'relative' }}>
            {input}
            <PasswordToggle show={toggle.show} onToggle={toggle.onToggle} subtleColor={labelColor} />
        </div>
    );
};

// Shared error/info message pair — every form mode shows the same styled <p> for
// `error`, and the same styled <p> for `info` (only when there's no error).
// Password-policy checklist, shown once the user is IN the password field.
//
// Two things it fixes. The rules used to be invisible until AFTER a failed
// submit, so a user only learned the policy by being rejected. And when first
// surfaced they sat under the field permanently, which pushed the form taller
// for everyone — including sign-in users who cannot act on them.
//
// So: revealed on focus, and kept visible while anything is still unmet even
// after blur (leaving mid-way and losing the list is worse than a little extra
// height). Once every rule passes and focus leaves, it collapses again.
//
// Rendered from PASSWORD_RULES (authHelpers) — the same list validatePassword
// checks — so the checklist can never promise a rule the validator does not
// enforce.
//
// Styling follows the auth card: brand yellow #FDD405 for the pending state
// (the same accent the labels and submit button use) and #22c55e for met, which
// is the app's positive colour everywhere else. State is carried by the icon AND
// a visually-hidden text label, never by colour alone.
export const PasswordRules = ({ password = '', visible = true, subtleColor = '#71717a' }) => {
    const allMet = PASSWORD_RULES.every((r) => r.test(password));
    return (
        <div
            style={{
                display: 'grid',
                // Animate on grid-template-rows so the reveal is a smooth open
                // rather than the form snapping taller.
                gridTemplateRows: visible ? '1fr' : '0fr',
                opacity: visible ? 1 : 0,
                transition: 'grid-template-rows 200ms ease, opacity 160ms ease',
            }}
            aria-hidden={!visible}
        >
            <div style={{ overflow: 'hidden' }}>
                <ul
                    style={{
                        listStyle: 'none',
                        margin: '8px 0 0',
                        padding: '9px 11px',
                        display: 'grid',
                        gap: 5,
                        borderRadius: 9,
                        background: 'rgba(253,212,5,0.04)',
                        border: '1px solid rgba(253,212,5,0.18)',
                    }}
                    aria-label="Password requirements"
                >
                    {PASSWORD_RULES.map(({ id, label, test }) => {
                        const met = test(password);
                        return (
                            <li key={id}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5,
                                    color: met ? '#22c55e' : subtleColor,
                                    transition: 'color 150ms',
                                }}>
                                {met
                                    ? <Check size={12} strokeWidth={3} aria-hidden="true" style={{ flexShrink: 0 }} />
                                    : <Circle size={9} strokeWidth={2.5} aria-hidden="true"
                                              style={{ flexShrink: 0, color: 'rgba(253,212,5,0.55)' }} />}
                                <span>{label}</span>
                                <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden',
                                               clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
                                    {met ? ' met' : ' not met'}
                                </span>
                            </li>
                        );
                    })}
                    {allMet && (
                        <li style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5,
                                     color: '#22c55e', fontWeight: 600, marginTop: 1 }}>
                            <Check size={12} strokeWidth={3} aria-hidden="true" style={{ flexShrink: 0 }} />
                            <span>Password meets all requirements</span>
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export const AuthAlerts = ({ error, info }) => (
    <>
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
    </>
);

// Shared gradient submit button (spinner while loading) used by all 4 forms —
// only the label text differs between them.
export const SubmitButton = ({ loading, label }) => (
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
            : label}
    </button>
);
