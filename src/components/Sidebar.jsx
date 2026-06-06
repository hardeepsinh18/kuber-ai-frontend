import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Plus, MessageSquare, PanelLeftClose,
    Sun, Moon, LogIn, Trash2, Search, Pencil, Check,
    BarChart3, TrendingUp,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useChatHistory } from '../context/ChatHistoryContext';
import LoginModal from './Auth/LoginModal';

const relativeTime = (ts) => {
    if (!ts) return '';
    const t = new Date(ts);
    if (isNaN(t.getTime())) return '';
    const diff = Date.now() - t.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
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
                'fixed md:static inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out md:transform-none overflow-hidden border-r',
                'bg-[#F5F4F0] border-zinc-200/70',
                'dark:bg-[#111110] dark:border-zinc-800/40',
                isOpen
                    ? 'translate-x-0 w-[min(280px,85vw)]'
                    : '-translate-x-full md:translate-x-0 w-[min(280px,85vw)] md:w-0 md:border-none md:opacity-0'
            )}>

                {/* ── Header ── */}
                <div className="px-4 py-4 flex items-center justify-between min-w-[280px]
                                border-b border-zinc-200/70 dark:border-zinc-800/40
                                bg-gradient-to-b from-amber-500/[0.04] to-transparent
                                dark:from-amber-500/[0.06] dark:to-transparent">
                    <NavLink to="/" className="flex items-center gap-3">
                        {/* Logo icon with layered glow */}
                        <div className="relative w-8 h-8 rounded-xl flex-shrink-0
                                        bg-gradient-to-br from-amber-400 to-amber-600
                                        flex items-center justify-center
                                        shadow-[0_2px_14px_rgba(212,160,23,0.50)]">
                            <BarChart3 size={16} className="text-black" strokeWidth={2.5} />
                            <div className="absolute inset-0 rounded-xl ring-1 ring-amber-300/40 dark:ring-amber-400/30" />
                        </div>
                        <div className="flex flex-col leading-none gap-0.5">
                            <span className="text-[13px] font-bold tracking-[0.1em] text-zinc-900 dark:text-white">
                                KUBER AI
                            </span>
                            <span className="text-[9px] tracking-[0.2em] text-zinc-400 dark:text-zinc-600 font-medium uppercase">
                                BY 72 STREET
                            </span>
                        </div>
                    </NavLink>

                    <button
                        onClick={toggleSidebar}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700
                                   hover:bg-zinc-200/60
                                   dark:text-zinc-600 dark:hover:text-zinc-300 dark:hover:bg-white/5
                                   transition-colors"
                        aria-label="Close sidebar"
                    >
                        <PanelLeftClose size={18} />
                    </button>
                </div>

                <div className="flex-1 flex flex-col min-w-[280px] overflow-hidden">

                    {/* ── New Chat ── */}
                    {(!supabaseConfigured || isAuthenticated) && (
                        <div className="px-3 mt-3 mb-2">
                            <button
                                onClick={onNewThread}
                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200
                                           text-zinc-500 border-zinc-200 bg-white/50
                                           hover:text-amber-700 hover:border-amber-300/80 hover:bg-amber-50 hover:shadow-[0_2px_10px_rgba(212,160,23,0.10)]
                                           dark:text-zinc-500 dark:border-zinc-700/50 dark:bg-white/[0.03]
                                           dark:hover:text-amber-400 dark:hover:border-amber-600/30 dark:hover:bg-amber-500/5"
                            >
                                <Plus size={15} />
                                New Chat
                            </button>
                        </div>
                    )}

                    {/* ── Search ── */}
                    {(!supabaseConfigured || isAuthenticated) && (
                        <div className="px-3 mb-3">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border
                                            bg-white/70 border-zinc-200 transition-all duration-200
                                            focus-within:border-amber-300/60 focus-within:shadow-[0_0_0_2px_rgba(212,160,23,0.08)]
                                            dark:bg-white/[0.04] dark:border-zinc-700/40
                                            dark:focus-within:border-amber-500/30">
                                <Search size={12} className="text-zinc-400 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search chats..."
                                    className="flex-1 bg-transparent text-xs outline-none border-none
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
                    )}

                    {/* ── Chat list ── */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-2">
                        {isListLoading ? (
                            <div className="space-y-1 pt-1">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i}
                                        className="h-8 rounded-lg bg-zinc-200/50 dark:bg-white/5 animate-pulse"
                                        style={{ opacity: 1 - i * 0.15 }} />
                                ))}
                            </div>
                        ) : filteredChats.length > 0 ? (
                            <div className="mb-6">
                                <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-600 mb-2 px-2 tracking-widest uppercase">
                                    {searchQuery ? `Results (${filteredChats.length})` : 'Recent'}
                                </p>
                                <div className="space-y-0.5" role="list">
                                    {filteredChats.map((chat) => (
                                        <div key={chat.id} role="listitem"
                                            className="group flex items-center gap-1 w-full rounded-xl
                                                       hover:bg-white/80 dark:hover:bg-white/[0.06]
                                                       hover:shadow-[0_1px_6px_rgba(0,0,0,0.05)]
                                                       transition-all duration-150">
                                            {editingId === chat.id ? (
                                                <div className="flex-1 flex items-center gap-1 px-2 py-1">
                                                    <input
                                                        autoFocus
                                                        value={editingTitle}
                                                        onChange={e => setEditingTitle(e.target.value)}
                                                        onBlur={() => commitRename(chat.id)}
                                                        onKeyDown={e => handleRenameKeyDown(e, chat.id)}
                                                        className="flex-1 text-sm bg-white dark:bg-zinc-900 border border-amber-400 rounded-lg px-2 py-1 outline-none text-zinc-800 dark:text-zinc-200"
                                                    />
                                                    <button onClick={() => commitRename(chat.id)}
                                                        className="p-1 text-amber-600 dark:text-amber-500">
                                                        <Check size={13} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleChatClick(chat.id)}
                                                        onKeyDown={(e) => handleChatKeyDown(e, chat.id)}
                                                        className="flex-1 min-w-0 text-left px-2 py-2 rounded-xl
                                                                   text-[13px] truncate flex items-center gap-2
                                                                   transition-colors
                                                                   text-zinc-500 group-hover:text-zinc-800
                                                                   dark:text-zinc-500 dark:group-hover:text-zinc-200"
                                                    >
                                                        <MessageSquare size={13}
                                                            className="flex-shrink-0 text-zinc-300 dark:text-zinc-700
                                                                       group-hover:text-amber-500/70 dark:group-hover:text-amber-600/70
                                                                       transition-colors" />
                                                        <span className="flex-1 truncate">{chat.title || 'New chat'}</span>
                                                        {chat.updatedAt && (
                                                            <span className="text-[10px] text-zinc-300 dark:text-zinc-700 flex-shrink-0">
                                                                {relativeTime(chat.updatedAt)}
                                                            </span>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={(e) => startEditing(e, chat)}
                                                        className="p-1.5 rounded-lg text-zinc-300 dark:text-zinc-700
                                                                   hover:text-amber-600 dark:hover:text-amber-500
                                                                   hover:bg-amber-50 dark:hover:bg-amber-500/10
                                                                   opacity-0 group-hover:opacity-100 transition-all"
                                                        title="Rename"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                    {deleteChat && (
                                                        <button
                                                            onClick={(e) => handleDeleteClick(e, chat.id)}
                                                            className={clsx(
                                                                'p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100',
                                                                deletingId === chat.id
                                                                    ? 'text-red-500 bg-red-50 dark:bg-red-900/20 opacity-100'
                                                                    : 'text-zinc-300 dark:text-zinc-700 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                            )}
                                                            title={deletingId === chat.id ? 'Confirm delete' : 'Delete'}
                                                        >
                                                            <Trash2 size={13} />
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
                    <div className="p-4 border-t border-zinc-200/70 dark:border-zinc-800/40
                                    bg-gradient-to-t from-amber-500/[0.03] to-transparent
                                    dark:from-amber-500/[0.04] dark:to-transparent">

                        {/* Theme toggle */}
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-600 tracking-widest uppercase">
                                Appearance
                            </span>
                            <button
                                onClick={toggleTheme}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                                           bg-zinc-200/60 dark:bg-white/5
                                           text-zinc-500 dark:text-zinc-500
                                           hover:text-amber-600 dark:hover:text-amber-400
                                           hover:bg-amber-50 dark:hover:bg-amber-500/10
                                           transition-all duration-200"
                                aria-label="Toggle theme"
                            >
                                {theme === 'light'
                                    ? <Sun size={13} />
                                    : <Moon size={13} />}
                                <span className="text-[11px] font-medium">
                                    {theme === 'light' ? 'Light' : 'Dark'}
                                </span>
                            </button>
                        </div>

                        {supabaseConfigured ? (
                            isAuthenticated && user ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 flex-shrink-0 rounded-full
                                                    bg-gradient-to-br from-amber-400/80 to-amber-600/80
                                                    border border-amber-300/40 dark:border-amber-700/40
                                                    flex items-center justify-center
                                                    text-xs font-bold text-black
                                                    shadow-[0_2px_8px_rgba(212,160,23,0.30)]">
                                        {(user.user_metadata?.full_name || user.email || '?').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
                                            {user.user_metadata?.full_name || user.email || 'User'}
                                        </p>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <TrendingUp size={9} className="text-amber-500" />
                                            <p className="text-[11px] text-amber-600 dark:text-amber-500 font-medium">Free Plan</p>
                                        </div>
                                    </div>
                                    <button onClick={signOut}
                                        className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400 transition-colors">
                                        Sign out
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowLogin(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200
                                               border-amber-300 bg-amber-50 text-amber-700
                                               hover:bg-amber-100 hover:shadow-[0_2px_10px_rgba(212,160,23,0.18)]
                                               dark:border-amber-700/30 dark:bg-amber-500/8 dark:text-amber-400 dark:hover:bg-amber-500/15"
                                >
                                    <LogIn size={15} />
                                    Sign in to save chats
                                </button>
                            )
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 flex-shrink-0 rounded-full
                                                bg-gradient-to-br from-amber-400/70 to-amber-600/60
                                                border border-amber-200 dark:border-amber-700/30
                                                flex items-center justify-center text-xs font-bold text-black">
                                    G
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">Guest</p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <TrendingUp size={9} className="text-amber-500" />
                                        <p className="text-[11px] text-amber-600 dark:text-amber-500 font-medium">Free Plan</p>
                                    </div>
                                </div>
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
