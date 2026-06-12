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

function AppContent() {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
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

function App() {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatHistoryProvider>
          <ChatModeProvider>
          {!splashDone && <SplashScreen onDone={handleSplashDone} />}
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<AuthPage />} />
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
