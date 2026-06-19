import { createPortal } from 'react-dom';
import { useEffect } from 'react';

const SECTOR_COLOR = {
    'IT Services':    '#6366f1',
    'Automobiles':    '#f59e0b',
    'Steel / Metals': '#64748b',
    'Power':          '#f97316',
    'FMCG':           '#10b981',
    'Chemicals':      '#8b5cf6',
    'Telecom':        '#06b6d4',
    'Banking':        '#3b82f6',
    'Insurance':      '#ec4899',
    'Infrastructure': '#84cc16',
    'Diversified':    '#a78bfa',
    'Realty':         '#fb923c',
    'Defence':        '#94a3b8',
};

const nameColor = (name) => {
    const palette = ['#6366f1','#8b5cf6','#f59e0b','#10b981','#3b82f6','#f97316','#06b6d4','#ec4899'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return palette[Math.abs(h) % palette.length];
};

const GroupClarificationPopup = ({ groupName, candidates, onSelect, onDismiss, disabled }) => {
    const root = document.getElementById('kuberai-popup-root');

    useEffect(() => {
        if (!root || !candidates?.length) return;
        const handler = (e) => {
            const idx = parseInt(e.key, 10);
            if (idx >= 1 && idx <= Math.min(candidates.length, 6)) {
                e.preventDefault();
                if (!disabled) onSelect(candidates[idx - 1].name || candidates[idx - 1].ticker);
            }
            if (e.key === 'Escape') onDismiss();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [candidates, disabled, onSelect, onDismiss, root]);

    if (!root || !candidates?.length) return null;

    const shown = candidates.slice(0, 6);

    return createPortal(
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingBottom: '112px',
            paddingLeft: '16px',
            paddingRight: '16px',
        }}>
            <div
                className="gcp-card"
                style={{
                    pointerEvents: 'auto',
                    width: '100%',
                    maxWidth: '560px',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    background: 'rgba(12, 12, 16, 0.97)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: '0 -2px 16px rgba(139,92,246,0.08), 0 24px 64px rgba(0,0,0,0.7)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Animated purple dot */}
                        <span style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: 'radial-gradient(circle, #c4b5fd, #7c3aed)',
                            boxShadow: '0 0 8px rgba(167,139,250,0.6)',
                            flexShrink: 0, display: 'inline-block',
                        }} />
                        <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5' }}>
                                {groupName}
                            </span>
                            <span style={{ fontSize: '12px', color: '#71717a', marginLeft: '6px' }}>
                                · select a company
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onDismiss}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#71717a',
                            width: '24px', height: '24px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '15px', lineHeight: 1,
                            transition: 'background 0.1s, color 0.1s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#d4d4d8'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#71717a'; }}
                    >×</button>
                </div>

                {/* Candidate rows */}
                {shown.map((c, i) => {
                    const ticker = (c.ticker || '').replace('.NS', '').replace('.BO', '');
                    const name = c.name || ticker;
                    const sector = c.sector || '';
                    const initial = name.charAt(0).toUpperCase();
                    const color = SECTOR_COLOR[sector] || nameColor(name);
                    return (
                        <button
                            key={c.ticker || i}
                            type="button"
                            disabled={disabled}
                            className={`gcp-row${i === shown.length - 1 ? ' last' : ''}`}
                            onClick={() => onSelect(name)}
                        >
                            {/* Avatar */}
                            <span style={{
                                width: '34px', height: '34px', borderRadius: '10px',
                                background: `${color}22`,
                                border: `1px solid ${color}44`,
                                color: color,
                                fontSize: '13px', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                {initial}
                            </span>

                            {/* Name + ticker */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {name}
                                </p>
                                <p style={{ fontSize: '11px', color: '#52525b', margin: '1px 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ color: '#71717a', fontWeight: 500 }}>{ticker}</span>
                                    {sector && (
                                        <>
                                            <span style={{ color: '#3f3f46' }}>·</span>
                                            <span style={{ color: color, opacity: 0.85 }}>{sector}</span>
                                        </>
                                    )}
                                </p>
                            </div>

                            {/* Keyboard shortcut + chevron */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                <span style={{
                                    width: '18px', height: '18px', borderRadius: '4px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#52525b', fontSize: '10px', fontWeight: 600,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>{i + 1}</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18l6-6-6-6"/>
                                </svg>
                            </div>
                        </button>
                    );
                })}

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '9px 16px',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                        <path d="M8 10h.01M12 10h.01M16 10h.01M8 14h8"/>
                    </svg>
                    <span style={{ fontSize: '10px', color: '#3f3f46', letterSpacing: '0.01em' }}>
                        Press <kbd style={{ fontFamily: 'inherit', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '3px', padding: '0 3px', fontSize: '10px', color: '#52525b' }}>1</kbd>–<kbd style={{ fontFamily: 'inherit', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '3px', padding: '0 3px', fontSize: '10px', color: '#52525b' }}>{shown.length}</kbd> or click · <kbd style={{ fontFamily: 'inherit', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '3px', padding: '0 3px', fontSize: '10px', color: '#52525b' }}>Esc</kbd> to dismiss
                    </span>
                </div>
            </div>
        </div>,
        root
    );
};

export default GroupClarificationPopup;
