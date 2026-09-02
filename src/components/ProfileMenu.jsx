import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, FileText, TrendingUp, ExternalLink, X, ChevronUp } from 'lucide-react';
// import PrivacyControls from './PrivacyControls'; // CONF-D-003: DPDP export/erasure
// controls were mounted here, then pulled back out at the user's request. The
// endpoints and component are untouched — re-add the import and the block below
// (where PrivacyControls used to sit, between the theme row and the Privacy/Terms
// link) to restore.

// Matches the sidebar's own expanded width (Sidebar.jsx: md:w-[220px]) so the
// menu reads as part of that column rather than a wider panel overhanging it.
const MENU_WIDTH = 220;

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
    const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
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

    useEffect(() => {
        if (!showPrivacyNotice) return undefined;
        const handleKey = (e) => { if (e.key === 'Escape') setShowPrivacyNotice(false); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [showPrivacyNotice]);

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

    const handlePrivacyClick = () => {
        setOpen(false);
        setShowPrivacyNotice(true);
    };

    return (
        <>
            {variant === 'expanded' ? (
                <button
                    ref={triggerRef}
                    onClick={handleToggle}
                    data-testid="account-menu-trigger"
                    // A bare name + avatar row gave no sign it opened anything: the
                    // only affordance was a hover tint, invisible until you were
                    // already on it (and absent entirely on touch). The chevron is a
                    // persistent cue, and it rotates to point at the open menu.
                    className={`w-full flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg
                                cursor-pointer transition-colors
                                hover:bg-zinc-200/70 dark:hover:bg-white/[0.07]
                                ${open ? 'bg-zinc-200/70 dark:bg-white/[0.07]' : ''}`}
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
                    <ChevronUp
                        size={14}
                        aria-hidden="true"
                        className={`flex-shrink-0 text-zinc-500 dark:text-zinc-400 transition-transform duration-200
                                    ${open ? 'rotate-0' : 'rotate-180'}`}
                    />
                </button>
            ) : (
                <button
                    ref={triggerRef}
                    onClick={handleToggle}
                    title="Account"
                    data-testid="account-menu-trigger"
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
                        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                    }}
                    // Surface tokens copied from the sidebar container itself
                    // (Sidebar.jsx: bg-[#E8E5DC]/border-zinc-300/80, dark
                    // bg-[#1a1a1a]/border-zinc-700/50). It previously used an amber
                    // border and an amber glow, which no other sidebar surface does —
                    // brand yellow is for actions (New chat, avatar), not container
                    // chrome, so the menu read as a foreign panel sitting on top of
                    // the rail instead of an extension of it.
                    className="overflow-hidden rounded-xl
                               border border-zinc-300/80 dark:border-zinc-700/50
                               bg-[#E8E5DC] dark:bg-[#1a1a1a]
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

                    <button
                        onClick={handlePrivacyClick}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-zinc-600 dark:text-zinc-300
                                   hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors border-b border-zinc-200/70 dark:border-zinc-800/60"
                    >
                        <FileText size={13} className="flex-shrink-0" />
                        {/* nowrap: at the sidebar-matched 220px width this is the
                            longest row in the menu and wrapped to two lines. */}
                        <span className="whitespace-nowrap">Privacy Policy &amp; Terms of Use</span>
                    </button>

                    <button
                        onClick={handleSignOutClick}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-red-600 dark:text-red-400
                                   hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut size={13} className="flex-shrink-0" />
                        Sign out
                    </button>
                </div>,
                document.body
            )}

            {showPrivacyNotice && createPortal(
                <div
                    className="fixed inset-0 z-[100000] flex items-center justify-center px-4"
                    style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
                >
                    <div className="absolute inset-0" onClick={() => setShowPrivacyNotice(false)} />
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="relative w-full max-w-sm rounded-2xl p-5
                                   border border-zinc-200 dark:border-[#FDD405]/40
                                   bg-white dark:bg-[#141310]
                                   shadow-xl animate-in fade-in zoom-in-95 duration-150"
                    >
                        <button
                            onClick={() => setShowPrivacyNotice(false)}
                            aria-label="Close"
                            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-md
                                       text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/70
                                       dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-white/10 transition-colors"
                        >
                            <X size={14} />
                        </button>

                        <div className="w-10 h-10 flex items-center justify-center rounded-full mb-3
                                        bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-[#FDD405]">
                            <FileText size={17} />
                        </div>

                        <h2 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                            Privacy Policy & Terms of Use
                        </h2>
                        <p className="text-[12.5px] leading-relaxed text-zinc-600 dark:text-zinc-400 mb-4">
                            VentyAI is a product by 72 Street. Our full Privacy Policy covers how we
                            collect, use, and protect your data, including account and market information.
                            <br />
                            Read it in full on our website before continuing to use VentyAI.
                        </p>

                        <div className="flex flex-col gap-2">
                            <a
                                href="https://www.72street.ai/privacy-policy"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setShowPrivacyNotice(false)}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl
                                           text-[12.5px] font-semibold transition-all duration-200
                                           bg-[#FDD405] text-zinc-900 hover:bg-[#e8c304]"
                            >
                                Privacy Policy
                                <ExternalLink size={12} />
                            </a>
                            <a
                                href="https://www.72street.ai/legal#terms"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setShowPrivacyNotice(false)}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl
                                           text-[12.5px] font-semibold transition-all duration-200
                                           border border-zinc-300 dark:border-zinc-700
                                           text-zinc-700 dark:text-zinc-200
                                           hover:bg-zinc-100 dark:hover:bg-white/5"
                            >
                                Terms of Use
                                <ExternalLink size={12} />
                            </a>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
