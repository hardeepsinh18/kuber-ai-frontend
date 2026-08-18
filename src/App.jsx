import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import ChatContainer from './components/Chat/ChatContainer';
import AuthGate from './components/Auth/AuthGate';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import AuthPage from './pages/AuthPage';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ChatHistoryProvider, useChatHistory } from './context/ChatHistoryContext';
import { ChatModeProvider } from './context/ChatModeContext';
import { AdminGuard } from './components/Admin/AdminGuard';
import AdminDashboard from './pages/Admin/AdminDashboard';
import PreviewPage from './pages/PreviewPage';
import { consumeSignOutRedirect } from './lib/signOutRedirect';

function AppContent() {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth >= 768;
    return true;
  });
  const { newChat, chatList, loadChat, deleteChat } = useChatHistory();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNewThread = () => {
    newChat();
    navigate('/', { replace: true });
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <Layout
      onNewThread={handleNewThread}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      showLogin={showLogin}
      setShowLogin={setShowLogin}
      showPortfolio={showPortfolio}
      setShowPortfolio={setShowPortfolio}
      chatList={chatList}
      loadChat={loadChat}
      deleteChat={deleteChat}
    >
      <ErrorBoundary>
        <Routes>
          <Route
            path="/chat/:chatId"
            element={
              <AuthGate>
                <ErrorBoundary>
                  <ChatContainer sidebarOpen={sidebarOpen} routeChatId />
                </ErrorBoundary>
              </AuthGate>
            }
          />
          <Route
            path="/"
            element={
              <AuthGate>
                <ErrorBoundary>
                  <ChatContainer sidebarOpen={sidebarOpen} />
                </ErrorBoundary>
              </AuthGate>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminDashboard />
              </AdminGuard>
            }
          />
        </Routes>
      </ErrorBoundary>
    </Layout>
  );
}

/**
 * The splash plays on EVERY load, including reloads and second tabs.
 *
 * History: QA-C-001 previously gated it to once per browser session via
 * sessionStorage, to avoid spending a returning user's time-to-interactive on a
 * brand moment with no informational payload. That was reverted deliberately
 * (product call, 2026-08-04) — the splash is wanted on every reload.
 *
 * The known trade-off is the one QA-C-001 raised: every reload now costs ~2.2s
 * before the app is interactive. If that becomes a complaint, the lever is
 * SplashScreen's own fade/done timers, or restoring the session gate below.
 *
 * The storage helpers are kept and still exported: they are the documented seam
 * for re-introducing a gate, and they must never throw (sessionStorage raises in
 * Safari private mode and when storage is disabled). They are intentionally not
 * consulted when deciding whether to render the splash.
 */
export const SPLASH_SEEN_KEY = 'venty:splash-seen';

export function hasSeenSplashThisSession() {
  try {
    return sessionStorage.getItem(SPLASH_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markSplashSeen() {
  try {
    sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
  } catch {
    /* storage unavailable — nothing to degrade, the splash shows regardless */
  }
}


function App() {
  // Starts false, so the splash renders on every load. Deliberately NOT seeded
  // from hasSeenSplashThisSession() — that is what made reloads skip it. The one
  // exemption is the load that follows a sign-out (see consumeSignOutRedirect),
  // where the user is on their way out and about to be sent to /login.
  const [splashDone, setSplashDone] = useState(consumeSignOutRedirect);
  const handleSplashDone = useCallback(() => {
    // Still recorded so anything else that wants "has the user seen it this
    // session" keeps working, and so restoring the gate is a one-line change.
    markSplashSeen();
    setSplashDone(true);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatHistoryProvider>
          <ChatModeProvider>
          {!splashDone && <SplashScreen onDone={handleSplashDone} />}
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<AuthPage />} />
              {/* SEC-C-004: /preview is the internal visual test harness. It renders
                  FABRICATED analyst output against REAL NSE tickers (TCS, WIPRO,
                  HDFCBANK, ICICIBANK) with no "sample data" marking, and it was
                  publicly reachable at https://aws.72street.ai/preview — so invented
                  prices and verdicts on real listed companies were being served from
                  our own domain. That is a misleading-financial-content problem, not a
                  cosmetic one.

                  Gated on import.meta.env.DEV, which is false in production builds, so
                  Vite tree-shakes the route AND PreviewPage out of the bundle entirely
                  — the same mechanism that removed the demo-login branch in SEC-C-007
                  (verified there by grepping the built asset). The harness keeps
                  working in `npm run dev`. */}
              {import.meta.env.DEV && (
                <Route path="/preview" element={<PreviewPage />} />
              )}
              <Route path="/*" element={<AppContent />} />
            </Routes>
          </BrowserRouter>
          </ChatModeProvider>
        </ChatHistoryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
