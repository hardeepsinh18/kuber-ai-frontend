import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { MessageSquare, ChevronLeft, X } from 'lucide-react';
import { adminFetch } from '../../../hooks/useAdminFetch';
import { fmtDate } from './format';
import { Spinner, ErrorBox } from './shared';

// ── Chat History Tab ─────────────────────────────────────────────────────────
const ChatHistoryTab = ({ selectedUser, onClearUser }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [userId, setUserId] = useState(selectedUser?.id || '');
    const [openThread, setOpenThread] = useState(null);

    useEffect(() => {
        if (selectedUser?.id) {
            setUserId(selectedUser.id);
        }
    }, [selectedUser]);

    // Deliberately NOT using useAdminFetch here: it fetches a dynamic path segment
    // (not query params), is gated on a truthy userId (no fetch — and no loading
    // spinner — until one is entered/selected), and starts `loading` at false
    // rather than true. Forcing it into the shared hook would change behavior.
    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        adminFetch(`/admin/dashboard/chat/${userId}`)
            .then(setData).catch(e => setErr(e.message)).finally(() => setLoading(false));
    }, [userId]);

    return (
        <div className="space-y-4">
            {selectedUser && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">{selectedUser.email}</span>
                    <button onClick={() => { onClearUser(); setData(null); setUserId(''); }} className="ml-auto text-amber-400 hover:text-amber-600 dark:hover:text-amber-300"><X size={14} /></button>
                </div>
            )}

            {!selectedUser && (
                <div className="flex gap-2">
                    <input value={userId} onChange={e => setUserId(e.target.value)}
                        placeholder="Enter user UUID..."
                        className="flex-1 max-w-sm px-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    <button onClick={() => { setData(null); setErr(null); }}
                        className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                        Load
                    </button>
                </div>
            )}

            {loading && <Spinner />}
            {err && <ErrorBox msg={err} onRetry={() => setErr(null)} />}
            {!userId && !loading && (
                <div className="text-center py-12 text-zinc-400">
                    <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Click "View Chats" on a user from the Users tab, or enter a user ID above.</p>
                </div>
            )}

            {data && (
                <div className="space-y-3">
                    <p className="text-sm text-zinc-500">{data.threads.length} thread{data.threads.length !== 1 ? 's' : ''}</p>
                    {data.threads.map(thread => (
                        <div key={thread.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setOpenThread(openThread === thread.id ? null : thread.id)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors text-left"
                            >
                                <div>
                                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{thread.title || 'Untitled thread'}</p>
                                    <p className="text-xs text-zinc-400 mt-0.5">{fmtDate(thread.created_at)} · {thread.messages?.length || 0} messages</p>
                                </div>
                                <ChevronLeft size={14} className={clsx('text-zinc-400 transition-transform', openThread === thread.id ? '-rotate-90' : 'rotate-180')} />
                            </button>
                            {openThread === thread.id && (
                                <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 space-y-3 max-h-96 overflow-y-auto">
                                    {thread.messages?.map((msg, i) => (
                                        <div key={i} className={clsx('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                            <div className={clsx('max-w-[75%] px-3 py-2 rounded-lg text-xs leading-relaxed',
                                                msg.role === 'user'
                                                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100'
                                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200')}>
                                                <p className="font-medium opacity-50 mb-0.5 text-[10px] uppercase">{msg.role}</p>
                                                <p className="whitespace-pre-wrap line-clamp-6">{msg.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {!data.threads.length && <p className="text-sm text-zinc-400">No chat history for this user.</p>}
                </div>
            )}
        </div>
    );
};

export default ChatHistoryTab;
