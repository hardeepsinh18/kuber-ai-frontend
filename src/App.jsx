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
import LegalPage from './pages/LegalPage';

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
 * QA-C-001: the splash ran on EVERY load — a fixed 2.2s gate in front of the
 * router, including every in-session reload and every return visit, with no
 * informational payload after the first time. That is pure added time-to-
 * interactive for a returning user.
 *
 * It now shows once per browser session. sessionStorage (not localStorage) is
 * deliberate: the brand moment still plays for a genuinely new visit, but a
 * reload or a second tab in the same session goes straight to the app.
 *
 * Reads are wrapped because sessionStorage throws in Safari private mode and
 * when storage is disabled — in that case we simply show the splash, which is
 * the current behaviour and never a broken screen.
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
    /* storage unavailable — the splash just shows again next load */
  }
}

function App() {
  // Initialised from session state, so a returning user never renders the
  // splash at all (rather than rendering and hiding it, which would still flash).
  const [splashDone, setSplashDone] = useState(hasSeenSplashThisSession);
  const handleSplashDone = useCallback(() => {
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
              <Route path="/terms" element={<LegalPage doc="terms" />} />
              <Route path="/privacy" element={<LegalPage doc="privacy" />} />
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
