import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Plus, MessageSquare,
    Sun, Moon, LogIn, Trash2, Search, Pencil, Check,
    TrendingUp,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useChatHistory } from '../context/ChatHistoryContext';
import LoginModal from './Auth/LoginModal';
import KuberLogo from './KuberLogo';

const relativeTime = (ts) => {
    if (!ts) return '';
    const t = new Date(ts);
    if (isNaN(t.getTime())) return '';
    const diff = Date.now() - t.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const Sidebar = ({ isOpen, toggleSidebar, onNewThread, showLogin = false, setShowLogin = () => {}, chatList = [], loadChat, deleteChat }) => {
    const { theme, toggleTheme } = useTheme();
    const { user, isAuthenticated, signOut, supabaseConfigured } = useAuth();
    const { renameChat, isListLoading } = useChatHistory();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        if (isOpen && window.innerWidth < 768) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) setSearchQuery('');
    }, [isOpen]);

    const filteredChats = searchQuery.trim()
        ? chatList.filter(c => (c.title || 'New chat').toLowerCase().includes(searchQuery.toLowerCase()))
        : chatList;

    const handleChatClick = (chatId) => {
        if (editingId === chatId) return;
        setDeletingId(null);
        loadChat(chatId);
        navigate(`/chat/${chatId}`, { replace: true });
        if (window.innerWidth < 768) toggleSidebar();
    };

    const handleChatKeyDown = (e, chatId) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleChatClick(chatId);
        }
    };

    const handleDeleteClick = (e, chatId) => {
        e.preventDefault();
        e.stopPropagation();
        if (deletingId === chatId) {
            deleteChat(chatId);
            navigate('/', { replace: true });
            setDeletingId(null);
        } else {
            setDeletingId(chatId);
            setTimeout(() => setDeletingId(null), 3000);
        }
    };

    const startEditing = (e, chat) => {
        e.preventDefault();
        e.stopPropagation();
        setDeletingId(null);
        setEditingId(chat.id);
        setEditingTitle(chat.title || 'New chat');
    };

    const commitRename = (id) => {
        const trimmed = editingTitle.trim();
        if (trimmed) renameChat(id, trimmed);
        setEditingId(null);
        setEditingTitle('');
    };

    const handleRenameKeyDown = (e, id) => {
        if (e.key === 'Enter') { e.preventDefault(); commitRename(id); }
        if (e.key === 'Escape') { setEditingId(null); setEditingTitle(''); }
    };

    const userInitials = (user?.user_metadata?.full_name || user?.email || 'G').slice(0, 2).toUpperCase();

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={clsx(
                    'fixed inset-0 z-30 transition-opacity md:hidden',
                    'bg-black/65 backdrop-blur-sm',
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
                onClick={toggleSidebar}
            />

            {/* Sidebar panel */}
            <div className={clsx(
                'flex flex-col transition-all duration-300 ease-in-out overflow-hidden border-r',
                'bg-[#F5F4F0] border-zinc-200/70',
                'dark:bg-[#0F0F0F] dark:border-zinc-800/40',
                'fixed md:static inset-y-0 left-0 z-40 h-full',
                'rounded-br-2xl',
                isOpen
                    ? 'w-[min(220px,85vw)] translate-x-0 md:w-[220px]'
                    : '-translate-x-full md:translate-x-0 w-[min(220px,85vw)] md:w-[52px]'
            )}>

                {/* ── EXPANDED CONTENT ── */}
                <div className={clsx(
                    'flex flex-col flex-1 min-w-[220px] overflow-hidden',
                    !isOpen && 'md:hidden'
                )}>
                    {/* ── Header ── */}
                    <div className="px-4 py-3 flex items-center justify-between
                                    border-b border-zinc-200/70 dark:border-zinc-800/40
                                    flex-shrink-0">
                        <NavLink to="/" className="flex items-center gap-2.5">
                            <KuberLogo size={34} className="text-amber-400 flex-shrink-0" />
                            <div className="flex flex-col leading-none gap-1">
                                <span className="text-[14px] font-bold tracking-[0.08em] text-zinc-900 dark:text-white">
                                    KUBER AI
                                </span>
                                <span className="text-[8.5px] tracking-[0.20em] text-zinc-400 dark:text-zinc-500 font-medium uppercase">
                                    BY 72 STREET
                                </span>
                            </div>
                        </NavLink>

                        {/* Mobile close only */}
                        <button
                            onClick={toggleSidebar}
                            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700
                                       hover:bg-zinc-200/60 dark:text-zinc-600 dark:hover:text-zinc-300
                                       dark:hover:bg-white/5 transition-colors"
                            aria-label="Close sidebar"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex flex-col flex-1 overflow-hidden">
                        {/* ── Search ── */}
                        <div className="px-2 mt-2 mb-1.5 flex-shrink-0">
                            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border
                                            bg-white/80 border-zinc-200 transition-all duration-200
                                            focus-within:border-amber-300/60
                                            dark:bg-white/[0.04] dark:border-zinc-700/40
                                            dark:focus-within:border-amber-500/30">
                                <Search size={11} className="text-zinc-400 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search Chats"
                                    className="flex-1 bg-transparent text-[11px] outline-none border-none
                                               text-zinc-600 placeholder:text-zinc-400
                                               dark:text-zinc-400 dark:placeholder:text-zinc-600"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')}
                                        className="text-zinc-400 hover:text-zinc-600 text-xs transition-colors">
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Chat list ── */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
                            {isListLoading ? (
                                <div className="space-y-1 pt-1">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i}
                                            className="h-6 rounded-md bg-zinc-200/50 dark:bg-white/5 animate-pulse"
                                            style={{ opacity: 1 - i * 0.15 }} />
                                    ))}
                                </div>
                            ) : filteredChats.length > 0 ? (
                                <div className="mb-4">
                                    <div className="px-1.5 mb-1.5">
                                        <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-600">
                                            {searchQuery ? `Results · ${filteredChats.length}` : 'Chats'}
                                        </span>
                                    </div>
                                    <div className="space-y-0.5" role="list">
                                        {filteredChats.map((chat) => (
                                            <div key={chat.id} role="listitem"
                                                className="group flex items-center gap-0.5 w-full rounded-md
                                                           hover:bg-white/80 dark:hover:bg-white/[0.06]
                                                           transition-all duration-150">
                                                {editingId === chat.id ? (
                                                    <div className="flex-1 flex items-center gap-1 px-1.5 py-0.5">
                                                        <input
                                                            autoFocus
                                                            value={editingTitle}
                                                            onChange={e => setEditingTitle(e.target.value)}
                                                            onBlur={() => commitRename(chat.id)}
                                                            onKeyDown={e => handleRenameKeyDown(e, chat.id)}
                                                            className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-amber-400 rounded-md px-1.5 py-0.5 outline-none text-zinc-800 dark:text-zinc-200"
                                                        />
                                                        <button onClick={() => commitRename(chat.id)}
                                                            className="p-0.5 text-amber-600 dark:text-amber-500">
                                                            <Check size={11} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleChatClick(chat.id)}
                                                            onKeyDown={(e) => handleChatKeyDown(e, chat.id)}
                                                            className="flex-1 min-w-0 text-left px-1.5 py-1.5 rounded-md
                                                                       text-[11.5px] truncate flex items-center gap-1.5
                                                                       transition-colors
                                                                       text-zinc-700 dark:text-zinc-400
                                                                       group-hover:text-zinc-900 dark:group-hover:text-zinc-200"
                                                        >
                                                            <span className="flex-1 truncate font-medium">{chat.title || 'New chat'}</span>
                                                            {chat.updatedAt && (
                                                                <span className="text-[10px] text-zinc-400 dark:text-zinc-600 flex-shrink-0">
                                                                    {relativeTime(chat.updatedAt)}
                                                                </span>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={(e) => startEditing(e, chat)}
                                                            className="p-1 rounded-md text-zinc-300 dark:text-zinc-700
                                                                       hover:text-amber-600 dark:hover:text-amber-500
                                                                       hover:bg-amber-50 dark:hover:bg-amber-500/10
                                                                       opacity-0 group-hover:opacity-100 transition-all"
                                                            title="Rename"
                                                        >
                                                            <Pencil size={10} />
                                                        </button>
                                                        {deleteChat && (
                                                            <button
                                                                onClick={(e) => handleDeleteClick(e, chat.id)}
                                                                className={clsx(
                                                                    'p-1 rounded-md transition-all opacity-0 group-hover:opacity-100',
                                                                    deletingId === chat.id
                                                                        ? 'text-red-500 bg-red-50 dark:bg-red-900/20 opacity-100'
                                                                        : 'text-zinc-300 dark:text-zinc-700 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                                )}
                                                                title={deletingId === chat.id ? 'Confirm delete' : 'Delete'}
                                                            >
                                                                <Trash2 size={11} />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="px-2 py-4 text-xs text-zinc-400 dark:text-zinc-600">
                                    {searchQuery
                                        ? 'No chats match.'
                                        : (supabaseConfigured && !isAuthenticated)
                                            ? 'Sign in to see history.'
                                            : 'No chats yet. Start a conversation!'}
                                </p>
                            )}
                        </div>

                        {/* ── Footer ── */}
                        <div className="px-2 py-2 border-t border-zinc-200/70 dark:border-zinc-800/40 flex-shrink-0">

                            {/* New Chat button */}
                            {(!supabaseConfigured || isAuthenticated) && (
                                <button
                                    onClick={onNewThread}
                                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-md
                                               text-[10.5px] font-semibold transition-all duration-200 mb-2
                                               bg-amber-400 text-zinc-900 hover:bg-amber-300
                                               dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700
                                               shadow-sm"
                                >
                                    <Plus size={10} />
                                    New Chat
                                </button>
                            )}

                            {/* Theme toggle */}
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-600 tracking-widest uppercase">
                                    Theme
                                </span>
                                <button
                                    onClick={toggleTheme}
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded
                                               bg-zinc-200/60 dark:bg-white/5
                                               text-zinc-500 dark:text-zinc-500
                                               hover:text-amber-600 dark:hover:text-amber-400
                                               hover:bg-amber-50 dark:hover:bg-amber-500/10
                                               transition-all duration-200"
                                    aria-label="Toggle theme"
                                >
                                    {theme === 'light'
                                        ? <Sun size={9} />
                                        : <Moon size={9} />}
                                    <span className="text-[9px] font-medium">
                                        {theme === 'light' ? 'Light' : 'Dark'}
                                    </span>
                                </button>
                            </div>

                            {supabaseConfigured ? (
                                isAuthenticated && user ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-9 h-9 flex-shrink-0 rounded-full
                                                        flex items-center justify-center
                                                        text-[13px] font-bold text-zinc-900"
                                             style={{ backgroundColor: '#D4A017' }}>
                                            {userInitials}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200 truncate">
                                                {user.user_metadata?.full_name || user.email || 'User'}
                                            </p>
                                            <div className="flex items-center gap-0.5 mt-0.5">
                                                <TrendingUp size={8} className="text-amber-500" />
                                                <p className="text-[10px] text-amber-500 font-medium">Free Plan</p>
                                            </div>
                                        </div>
                                        <button onClick={signOut}
                                            className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400 transition-colors">
                                            Sign out
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowLogin(true)}
                                        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10.5px] font-medium transition-all duration-200
                                                   border-amber-300 bg-amber-50 text-amber-700
                                                   hover:bg-amber-100
                                                   dark:border-amber-700/30 dark:bg-amber-500/8 dark:text-amber-400 dark:hover:bg-amber-500/15"
                                    >
                                        <LogIn size={11} />
                                        Sign in to save chats
                                    </button>
                                )
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 flex-shrink-0 rounded-full
                                                    flex items-center justify-center text-[13px] font-bold text-zinc-900"
                                         style={{ backgroundColor: '#D4A017' }}>
                                        G
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200">Guest</p>
                                        <div className="flex items-center gap-0.5 mt-0.5">
                                            <TrendingUp size={8} className="text-amber-500" />
                                            <p className="text-[10px] text-amber-500 font-medium">Free Plan</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── COLLAPSED ICON STRIP (desktop only) ── */}
                <div className={clsx(
                    'flex-col items-center py-4 hidden h-full',
                    !isOpen && 'md:flex'
                )}>
                    {/* Top section */}
                    <NavLink to="/" className="mb-3">
                        <KuberLogo size={28} className="text-amber-400" />
                    </NavLink>

                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300
                                   hover:bg-zinc-200/60 dark:hover:bg-white/5 transition-colors"
                        title="Search chats"
                    >
                        <Search size={17} />
                    </button>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Bottom: New chat, theme toggle, avatar */}
                    <div className="flex flex-col items-center gap-3 pb-2">
                        {(!supabaseConfigured || isAuthenticated) && (
                            <button
                                onClick={onNewThread}
                                title="New chat"
                                className="w-9 h-9 flex items-center justify-center rounded-xl
                                           border border-zinc-700 dark:border-zinc-600
                                           bg-zinc-900 dark:bg-zinc-900
                                           text-zinc-300 hover:text-white
                                           hover:border-zinc-500
                                           transition-all duration-200"
                            >
                                <Plus size={16} strokeWidth={2} />
                            </button>
                        )}

                        <button
                            onClick={toggleTheme}
                            title={theme === 'light' ? 'Switch to dark' : 'Switch to light'}
                            className="w-8 h-8 flex items-center justify-center rounded-lg
                                       text-zinc-400 hover:text-amber-400
                                       transition-colors"
                        >
                            {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        {/* User avatar */}
                        {supabaseConfigured ? (
                            isAuthenticated && user ? (
                                <button
                                    onClick={signOut}
                                    title="Sign out"
                                    className="w-11 h-11 flex items-center justify-center rounded-full
                                               text-zinc-900 text-[13px] font-bold
                                               hover:brightness-110 transition-all"
                                    style={{ backgroundColor: '#D4A017' }}
                                >
                                    {userInitials}
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowLogin(true)}
                                    title="Sign in"
                                    className="w-11 h-11 flex items-center justify-center rounded-full
                                               bg-zinc-200 dark:bg-zinc-800 text-zinc-500
                                               hover:bg-amber-100 dark:hover:bg-amber-900/30
                                               transition-colors"
                                >
                                    <LogIn size={16} />
                                </button>
                            )
                        ) : (
                            <div className="w-11 h-11 flex items-center justify-center rounded-full
                                            text-zinc-900 text-[13px] font-bold"
                                 style={{ backgroundColor: '#D4A017' }}>
                                G
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
        </>
    );
};

export default Sidebar;
