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

            {/* Desktop sidebar toggle — circle straddling sidebar's right edge */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={clsx(
                    'hidden md:flex fixed top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 transition-all duration-300',
                    'w-11 h-11 rounded-full items-center justify-center',
                    'bg-[#0F0F0F]',
                    sidebarOpen ? 'left-[220px]' : 'left-[52px]'
                )}
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
                {sidebarOpen
                    ? <ChevronsLeft size={18} className="text-zinc-300" />
                    : <ChevronsRight size={18} className="text-zinc-300" />}
            </button>

            {/* ── Main content column ── */}
            <div className="relative z-10 flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300">
                {/* Page content */}
                <div className="flex-1 overflow-hidden relative">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;
