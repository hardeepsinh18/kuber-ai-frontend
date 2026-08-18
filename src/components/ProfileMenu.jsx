import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, FileText, TrendingUp } from 'lucide-react';
// import PrivacyControls from './PrivacyControls'; // CONF-D-003: DPDP export/erasure
// controls were mounted here, then pulled back out at the user's request. The
// endpoints and component are untouched — re-add the import and the block below
// (where PrivacyControls used to sit, between the theme row and the Privacy/Terms
// link) to restore.

const MENU_WIDTH = 256; // w-64

/**
 * Click-to-open account menu (name/avatar trigger), replacing the sidebar's
 * previously always-visible theme/profile/sign-out footer row.
 *
 * Rendered via a portal into document.body: the sidebar's own container has
 * overflow-hidden (for the open/collapse width transition), and in the
 * collapsed icon-strip variant the menu is far wider than its ~44px avatar
 * trigger, so an absolutely-positioned child would get clipped. Position is
 * computed from the trigger's bounding rect instead.
 */
export default function ProfileMenu({
    user,
    theme,
    toggleTheme,
    onSignOut,
    variant = 'expanded', // 'expanded' | 'collapsed'
}) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ bottom: 0, left: 0 });
    const wrapRef = useRef(null);
    const triggerRef = useRef(null);

    const calcPos = () => {
        if (!triggerRef.current) return;
        const r = triggerRef.current.getBoundingClientRect();
        const left = Math.min(r.left, window.innerWidth - MENU_WIDTH - 8);
        setPos({ bottom: window.innerHeight - r.top + 8, left: Math.max(8, left) });
    };

    useEffect(() => {
        if (!open) return undefined;
        const handleClick = (e) => {
            if (
                wrapRef.current && !wrapRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)
            ) setOpen(false);
        };
        const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        window.addEventListener('resize', calcPos);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
            window.removeEventListener('resize', calcPos);
        };
    }, [open]);

    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const initials = (user?.user_metadata?.full_name || user?.email || 'U').slice(0, 2).toUpperCase();

    const handleToggle = () => {
        if (!open) calcPos();
        setOpen((o) => !o);
    };

    const handleSignOutClick = () => {
        setOpen(false);
        onSignOut();
    };

    return (
        <>
            {variant === 'expanded' ? (
                <button
                    ref={triggerRef}
                    onClick={handleToggle}
                    className="w-full flex items-center gap-2.5 px-1 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                    aria-haspopup="menu"
                    aria-expanded={open}
                >
                    <div
                        className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-900 text-[12px] font-bold flex-shrink-0"
                        style={{ backgroundColor: '#FDD405' }}
                    >
                        {initials}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                        <p className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-100 truncate leading-tight">{displayName}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                            <TrendingUp size={8} className="text-zinc-700 dark:text-[#FDD405] flex-shrink-0" />
                            <span className="text-[10px] text-zinc-700 dark:text-[#FDD405] font-medium">Free Plan</span>
                        </div>
                    </div>
                </button>
            ) : (
                <button
                    ref={triggerRef}
                    onClick={handleToggle}
                    title="Account"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    className="w-11 h-11 flex items-center justify-center rounded-full
                               text-zinc-900 text-[13px] font-bold hover:brightness-110 transition-all"
                    style={{ backgroundColor: '#FDD405' }}
                >
                    {initials}
                </button>
            )}

            {open && createPortal(
                <div
                    ref={wrapRef}
                    role="menu"
                    style={{
                        position: 'fixed',
                        bottom: pos.bottom,
                        left: pos.left,
                        width: MENU_WIDTH,
                        zIndex: 99999,
                        boxShadow: '0 0 20px rgba(253,212,5,0.10), 0 8px 24px rgba(0,0,0,0.35)',
                    }}
                    className="overflow-hidden rounded-xl
                               border border-zinc-200 dark:border-[#FDD405]/40
                               bg-white dark:bg-[#141310]
                               shadow-lg shadow-black/10 dark:shadow-black/40
                               animate-in fade-in slide-in-from-bottom-1 duration-150"
                >
                    <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-zinc-200/70 dark:border-zinc-800/60">
                        <div
                            className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-900 text-[12px] font-bold flex-shrink-0"
                            style={{ backgroundColor: '#FDD405' }}
                        >
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[12.5px] font-semibold text-zinc-800 dark:text-zinc-100 truncate">{displayName}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                                <TrendingUp size={8} className="text-zinc-700 dark:text-[#FDD405] flex-shrink-0" />
                                <span className="text-[10px] text-zinc-700 dark:text-[#FDD405] font-medium">Free Plan</span>
                            </div>
                        </div>
                    </div>

                    <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-zinc-200/70 dark:border-zinc-800/60">
                        <span className="text-[12px] text-zinc-600 dark:text-zinc-300">Theme</span>
                        <button
                            onClick={toggleTheme}
                            className="relative w-10 h-[22px] rounded-full overflow-hidden transition-colors duration-200 flex-shrink-0"
                            style={{ backgroundColor: theme === 'light' ? '#FDD405' : '#52525b' }}
                            aria-label="Toggle theme"
                        >
                            <span
                                className="absolute top-[3px] left-0 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                                style={{ transform: `translateX(${theme === 'dark' ? '3px' : '21px'})` }}
                            />
                        </button>
                    </div>

                    <a
                        href="https://72street.ai/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3.5 py-2.5 text-[12px] text-zinc-600 dark:text-zinc-300
                                   hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors border-b border-zinc-200/70 dark:border-zinc-800/60"
                    >
                        <FileText size={13} className="flex-shrink-0" />
                        Privacy Policy & Terms of Use
                    </a>

                    <button
                        onClick={handleSignOutClick}
                        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[12px] text-red-600 dark:text-red-400
                                   hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut size={13} className="flex-shrink-0" />
                        Sign out
                    </button>
                </div>,
                document.body
            )}
        </>
    );
}
