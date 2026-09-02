import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ProtectedRoute from './components/ProtectedRoute';
import ToastProvider from './components/ui/Toast';
import VOXIOChatWidget from './components/ui/VOXIOChatWidget';
import './App.css';

import PublicLayout from './layouts/PublicLayout';

// ⚡ Lazy-load heavy pages — only downloaded when the user navigates to them
// This reduces the initial JS bundle by ~60%
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const DashboardHome = lazy(() => import('./pages/dashboard/Home'));
const AiTraining = lazy(() => import('./pages/dashboard/AiTraining'));
const Integrations = lazy(() => import('./pages/dashboard/Integrations'));
const TelegramTab = lazy(() => import('./pages/dashboard/TelegramTab'));
const WebsiteTab = lazy(() => import('./pages/dashboard/WebsiteTab'));
const WhatsappTab = lazy(() => import('./pages/dashboard/WhatsappTab'));
const WhatsappBulk = lazy(() => import('./pages/dashboard/WhatsappBulk'));
const InstagramTab = lazy(() => import('./pages/dashboard/InstagramTab'));
const ModelTest = lazy(() => import('./pages/dashboard/ModelTest'));
const Settings = lazy(() => import('./pages/dashboard/Settings'));
const Orders = lazy(() => import('./pages/dashboard/Orders'));
const Leads = lazy(() => import('./pages/dashboard/Leads'));
const WidgetTab = lazy(() => import('./pages/dashboard/WidgetTab'));
const ChatbotEditor = lazy(() => import('./pages/dashboard/ChatbotEditor'));
const Products = lazy(() => import('./pages/dashboard/Products'));
const Conversations = lazy(() => import('./pages/dashboard/Conversations'));
const Analytics = lazy(() => import('./pages/dashboard/Analytics'));
const TeamManagement = lazy(() => import('./pages/dashboard/TeamManagement'));
const AiCopilot = lazy(() => import('./pages/dashboard/AiCopilot'));

const OnboardingProfile = lazy(() => import('./pages/onboarding/Profile'));
const OnboardingKnowledge = lazy(() => import('./pages/onboarding/Knowledge'));
const OnboardingConnect = lazy(() => import('./pages/onboarding/Connect'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const Blog = lazy(() => import('./pages/Blog'));
const DocsLayout = lazy(() => import('./pages/docs/DocsLayout'));
const DocsOverview = lazy(() => import('./pages/docs/DocsOverview'));
const ShopifyIntegration = lazy(() => import('./pages/docs/ShopifyIntegration'));
const MetaIntegration = lazy(() => import('./pages/docs/MetaIntegration'));
const TelegramIntegration = lazy(() => import('./pages/docs/TelegramIntegration'));
const WidgetIntegration = lazy(() => import('./pages/docs/WidgetIntegration'));
const Support = lazy(() => import('./pages/Support'));
const AgentsExplorer = lazy(() => import('./pages/AgentsExplorer'));
const ChatWidget = lazy(() => import('./pages/ChatWidget'));
const ChatPage = lazy(() => import('./pages/ChatPage'));

// ── Global Widget — renders on all pages except auth/widget/chat ──
const GlobalWidget = () => {
  const location = useLocation();
  const HIDE_EXACT = ['/login', '/register', '/forgot-password'];
  const HIDE_PREFIX = ['/widget/', '/chat/'];
  const hidden =
    HIDE_EXACT.includes(location.pathname) ||
    HIDE_PREFIX.some(p => location.pathname.startsWith(p));
  if (hidden) return null;
  return <VOXIOChatWidget />;
};

// Minimal loading fallback — near-zero CLS
const PageFallback = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '60vh', opacity: 0.4
  }}>
    <div style={{
      width: 32, height: 32, border: '3px solid var(--color-border)',
      borderTopColor: 'var(--color-text)', borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
  </div>
);

function App() {
  useEffect(() => {
    // Hide loader immediately if not on the homepage
    if (window.location.pathname !== '/') {
      const loader = document.getElementById('splash-loader');
      if (loader) {
        loader.style.display = 'none';
      }
    }
    
    // Safety fallback: if on homepage but something fails, hide loader after 10s
    if (window.location.pathname === '/') {
      const fallbackTimer = setTimeout(() => {
        const loader = document.getElementById('splash-loader');
        if (loader) {
          loader.style.opacity = '0';
          setTimeout(() => { loader.style.display = 'none'; }, 500);
        }
      }, 10000); // 10 seconds max wait time for 3D model
      
      return () => clearTimeout(fallbackTimer);
    }
  }, []);

  return (
    <Router>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
            <div className="app">
              <GlobalWidget />
              <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Public Routes with Widget */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/about" element={<AboutUs />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/docs" element={<DocsLayout />}>
                    <Route index element={<DocsOverview />} />
                    <Route path="shopify" element={<ShopifyIntegration />} />
                    <Route path="meta" element={<MetaIntegration />} />
                    <Route path="telegram" element={<TelegramIntegration />} />
                    <Route path="widget" element={<WidgetIntegration />} />
                  </Route>
                  <Route path="/support" element={<Support />} />
                </Route>

                {/* Auth Routes (No Widget) */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/onboarding/profile" element={<OnboardingProfile />} />
                <Route path="/onboarding/knowledge" element={<OnboardingKnowledge />} />
                <Route path="/onboarding/connect" element={<OnboardingConnect />} />
                
                <Route path="/agents" element={<AgentsExplorer />} />
                <Route path="/agents/:apiKey" element={<AgentsExplorer />} />
                <Route path="/widget/:apiKey" element={<ChatWidget />} />
                <Route path="/chat/:slug" element={<ChatPage />} />
                {/* Dashboard routes */}
                <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route index element={<DashboardHome />} />
                  <Route path="ai-training" element={<AiTraining />} />
                  <Route path="model-test" element={<ModelTest />} />
                  <Route path="integrations" element={<Integrations />} />
                  <Route path="telegram" element={<TelegramTab />} />
                  <Route path="website-chat" element={<WebsiteTab />} />
                  <Route path="whatsapp" element={<WhatsappTab />} />
                  <Route path="whatsapp-bulk" element={<WhatsappBulk />} />
                  <Route path="instagram" element={<InstagramTab />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="leads" element={<Leads />} />
                  <Route path="widget" element={<WidgetTab />} />
                  <Route path="chatbot-editor" element={<ChatbotEditor />} />
                  <Route path="products" element={<Products />} />
                  <Route path="conversations" element={<Conversations />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="team" element={<TeamManagement />} />
                  <Route path="ai-copilot" element={<AiCopilot />} />
                </Route>
              </Routes>
              </Suspense>
            </div>
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
