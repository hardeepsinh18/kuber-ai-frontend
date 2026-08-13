import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

/* Hover tooltip — uses a portal so overflow:hidden on ancestors can't clip it */
export const InfoTip = ({ text }) => {
    const [vis, setVis]   = useState(false);
    const [pos, setPos]   = useState({ top: 0, left: 0 });
    const btnRef          = useRef(null);

    const calcPos = () => {
        if (btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setPos({ top: r.top, left: r.left + r.width / 2 });
        }
    };

    if (!text) return null;

    return (
        <div className="inline-flex flex-shrink-0"
             onMouseEnter={() => { calcPos(); setVis(true); }}
             onMouseLeave={() => setVis(false)}>
            <button
                ref={btnRef}
                onClick={e => { e.stopPropagation(); calcPos(); setVis(v => !v); }}
                className="w-[14px] h-[14px] rounded-full border border-zinc-500 dark:border-zinc-600 text-zinc-400 dark:text-zinc-500 text-[8px] font-bold flex items-center justify-center hover:border-zinc-300 hover:text-zinc-200 transition-colors leading-none"
                style={{ fontFamily: 'serif' }}
            >i</button>
            {vis && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top:  pos.top - 10,
                        left: pos.left,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 99999,
                    }}
                    className="w-56 p-3 bg-zinc-900 border border-zinc-600 rounded-xl shadow-2xl text-[10px] text-zinc-300 leading-relaxed pointer-events-none"
                >
                    {text.split('\n\n').map((part, i) => (
                        <p key={i} className={i > 0 ? 'mt-2 font-semibold text-zinc-200' : ''}>{part}</p>
                    ))}
                    {/* caret pointing down */}
                    <div style={{
                        position: 'absolute', top: '100%', left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0, height: 0,
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: '5px solid #3f3f46',
                    }} />
                </div>,
                document.body
            )}
        </div>
    );
};
