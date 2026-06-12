import { clsx } from 'clsx';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import BackgroundEffect from './BackgroundEffect';
import Sidebar from './Sidebar';

const Layout = ({ children, onNewThread, sidebarOpen, setSidebarOpen, showLogin, setShowLogin, chatList = [], loadChat, deleteChat }) => {
    return (
        <div className="relative min-h-screen w-full overflow-hidden font-sans flex transition-colors duration-300 bg-[#F5F2E8] text-zinc-900 dark:bg-[#0A0A0A] dark:text-zinc-100">
            <BackgroundEffect />

            <Sidebar
                isOpen={sidebarOpen}
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                onNewThread={onNewThread}
                showLogin={showLogin}
                setShowLogin={setShowLogin}
                chatList={chatList}
                loadChat={loadChat}
                deleteChat={deleteChat}
            />

            {/* Sidebar toggle — true D-shape semicircle, overlaps sidebar border by 1px to hide the line */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={clsx(
                    'hidden md:flex fixed top-1/2 -translate-y-1/2 z-50 transition-all duration-300',
                    'w-6 h-12 rounded-r-full items-center justify-center',
                    'bg-[#EDEAE0] dark:bg-[#1a1a1a]',
                    'border-t border-r border-b border-zinc-300/60 dark:border-zinc-800',
                    'hover:bg-[#E3DFD4] dark:hover:bg-[#222]',
                    sidebarOpen ? 'left-[219px]' : 'left-[51px]'
                )}
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
                {sidebarOpen
                    ? <ChevronsLeft size={11} className="text-zinc-500 dark:text-zinc-500" />
                    : <ChevronsRight size={11} className="text-zinc-500 dark:text-zinc-500" />}
            </button>

            {/* ── Main content column ── */}
            <div className="relative z-10 flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300">
                <div className="flex-1 overflow-hidden relative">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;
