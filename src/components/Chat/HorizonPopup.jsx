import { createPortal } from 'react-dom';

const HorizonPopup = ({ stock, shortQuery, longQuery, onSelect, onDismiss, disabled }) => {
    const root = document.getElementById('kuberai-popup-root');
    if (!root) return null;

    return createPortal(
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingBottom: '110px',
            paddingLeft: '16px',
            paddingRight: '16px',
        }}>
            <div style={{
                pointerEvents: 'auto',
                width: '100%',
                maxWidth: '560px',
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#18181b',
                border: '1px solid #3f3f46',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                fontFamily: 'Inter, system-ui, sans-serif',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #3f3f46' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#d4d4d8' }}>
                        Are you looking at{' '}
                        <strong style={{ color: '#fff' }}>{stock}</strong>{' '}
                        for…
                    </span>
                    <button
                        type="button"
                        onClick={onDismiss}
                        style={{ background: 'none', border: 'none', color: '#71717a', fontSize: '20px', lineHeight: 1, cursor: 'pointer', padding: '0 2px' }}
                    >×</button>
                </div>

                {/* Short Term */}
                <HorizonOption
                    number="1"
                    label="⚡  Short Term"
                    subtitle="Weeks to a few months"
                    disabled={disabled}
                    onClick={() => onSelect(shortQuery)}
                />

                {/* Long Term */}
                <HorizonOption
                    number="2"
                    label="📅  Long Term"
                    subtitle="1+ years investment"
                    disabled={disabled}
                    onClick={() => onSelect(longQuery)}
                    last
                />

                <p style={{ textAlign: 'center', fontSize: '11px', color: '#52525b', padding: '8px 0', margin: 0 }}>
                    Or type your preference in the box below
                </p>
            </div>
        </div>,
        root
    );
};

const HorizonOption = ({ number, label, subtitle, disabled, onClick, last }) => {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '13px 16px',
                background: 'none',
                border: 'none',
                borderBottom: last ? 'none' : '1px solid #27272a',
                cursor: disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                opacity: disabled ? 0.5 : 1,
                transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#27272a'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
            <span style={{
                width: '26px', height: '26px', borderRadius: '7px',
                background: '#27272a', color: '#a1a1aa',
                fontSize: '12px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>{number}</span>
            <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5', margin: 0 }}>{label}</p>
                <p style={{ fontSize: '11px', color: '#71717a', margin: '2px 0 0' }}>{subtitle}</p>
            </div>
            <span style={{ color: '#52525b', fontSize: '18px', lineHeight: 1 }}>›</span>
        </button>
    );
};

export default HorizonPopup;
