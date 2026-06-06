import BackgroundEffect from './BackgroundEffect';
import Sidebar from './Sidebar';
import { PanelLeft } from 'lucide-react';

const Layout = ({ children, onNewThread, sidebarOpen, setSidebarOpen, showLogin, setShowLogin, chatList = [], loadChat, deleteChat }) => {
    return (
        <div className="relative min-h-screen w-full overflow-hidden font-sans flex transition-colors duration-300 bg-[#FDFAF3] text-zinc-900 dark:bg-[#09090A] dark:text-zinc-100">
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

            <div className="relative z-10 flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300">

                {/* Mobile / Sidebar Toggle Header Trigger - Shows when Sidebar is CLOSED */}
                <div className={`absolute top-4 android-lg:top-4 left-4 android-lg:left-4 z-50 transition-opacity duration-300 ${!sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-xl transition-colors text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:text-zinc-500 dark:hover:text-amber-400 dark:hover:bg-amber-500/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700/50 shadow-sm"
                        title="Open Sidebar"
                    >
                        <PanelLeft size={20} className="android-lg:w-5 android-lg:h-5" />
                    </button>
                </div>

                {children}
            </div>
        </div>
    );
};

export default Layout;
