import { useState } from 'react';
import { clsx } from 'clsx';
import { Activity, Users, MessageSquare, BarChart3 } from 'lucide-react';
import OverviewTab from './AdminDashboard/OverviewTab';
import UsersTab from './AdminDashboard/UsersTab';
import QueryLogsTab from './AdminDashboard/QueryLogsTab';
import ChatHistoryTab from './AdminDashboard/ChatHistoryTab';
import ApiStatsTab from './AdminDashboard/ApiStatsTab';

// ── Main Dashboard ───────────────────────────────────────────────────────────
const TABS = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'queries', label: 'Query Logs', icon: MessageSquare },
    { id: 'chat', label: 'Chat History', icon: MessageSquare },
    { id: 'api', label: 'API Stats', icon: BarChart3 },
];

export default function AdminDashboard() {
    const [tab, setTab] = useState('overview');
    const [chatUser, setChatUser] = useState(null);

    const handleViewChat = (user) => {
        setChatUser(user);
        setTab('chat');
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">VentyAI Admin</h1>
                        <p className="text-xs text-zinc-400 mt-0.5">Internal dashboard · 72Street.ai</p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">Live</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Tab bar */}
                <div className="flex gap-1 mb-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 w-fit">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setTab(id)}
                            className={clsx('flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
                                tab === id
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800')}>
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {tab === 'overview' && <OverviewTab />}
                {tab === 'users' && <UsersTab onViewChat={handleViewChat} />}
                {tab === 'queries' && <QueryLogsTab />}
                {tab === 'chat' && <ChatHistoryTab selectedUser={chatUser} onClearUser={() => setChatUser(null)} />}
                {tab === 'api' && <ApiStatsTab />}
            </div>
        </div>
    );
}
