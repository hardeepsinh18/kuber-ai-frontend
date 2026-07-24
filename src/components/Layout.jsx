import { clsx } from 'clsx';
import { ChevronsLeft, ChevronsRight, Menu, Plus } from 'lucide-react';
import BackgroundEffect from './BackgroundEffect';
import Sidebar from './Sidebar';
import KuberLogo from './KuberLogo';
import PortfolioOverlay from './Chat/PortfolioOverlay';
import { useTheme } from '../context/ThemeContext';

const Layout = ({ children, onNewThread, sidebarOpen, setSidebarOpen, showLogin, setShowLogin,
    showPortfolio, setShowPortfolio, chatList = [], loadChat, deleteChat }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    return (
        <div className="relative h-screen h-[100dvh] w-full overflow-hidden font-sans flex transition-colors duration-300 bg-[#F5F2E8] text-zinc-900 dark:bg-[#0A0A0A] dark:text-zinc-100">
            <BackgroundEffect />

            <Sidebar
                isOpen={sidebarOpen}
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                onNewThread={onNewThread}
                onPortfolioClick={() => setShowPortfolio(true)}
                showLogin={showLogin}
                setShowLogin={setShowLogin}
                chatList={chatList}
                loadChat={loadChat}
                deleteChat={deleteChat}
            />

            {showPortfolio && (
                <PortfolioOverlay onClose={() => setShowPortfolio(false)} />
            )}

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
            <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 min-w-0">

                {/* Mobile top bar — hamburger + brand + new chat. Hidden on md+ (desktop uses the side D-toggle). */}
                <header className="md:hidden flex items-center gap-1.5 px-2.5 h-14 flex-shrink-0
                                   border-b border-zinc-200/70 dark:border-zinc-800/60
                                   bg-[#F5F2E8]/85 dark:bg-[#0A0A0A]/85 backdrop-blur-md">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open menu"
                        className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300
                                   hover:bg-zinc-200/70 dark:hover:bg-white/5 active:scale-95 transition">
                        <Menu size={20} />
                    </button>

                    <div className="flex items-center gap-2 min-w-0">
                        <KuberLogo size={24} variant={isDark ? 'mark' : 'mark-light'} className="flex-shrink-0" />
                        <KuberLogo size={13} variant={isDark ? 'wordmark' : 'wordmark-light'} alt="Venty" className="flex-shrink-0" />
                    </div>

                    <div className="flex-1" />

                    <button
                        onClick={onNewThread}
                        aria-label="New chat"
                        className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0
                                   bg-[#FDD405] text-zinc-900 hover:bg-[#e8c304] active:scale-95 transition shadow-sm">
                        <Plus size={18} strokeWidth={2.5} />
                    </button>
                </header>

                <div className="flex-1 overflow-hidden relative">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;
