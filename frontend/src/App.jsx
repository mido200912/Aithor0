import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import OnboardingProfile from './pages/onboarding/Profile';
import OnboardingKnowledge from './pages/onboarding/Knowledge';
import OnboardingConnect from './pages/onboarding/Connect';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/dashboard/Home';
import Inbox from './pages/dashboard/Inbox';
import AiTraining from './pages/dashboard/AiTraining';
import Integrations from './pages/dashboard/Integrations';
import ModelTest from './pages/dashboard/ModelTest';
import Settings from './pages/dashboard/Settings';
import './App.css';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <div className="app">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/onboarding/profile" element={<OnboardingProfile />} />
                <Route path="/onboarding/knowledge" element={<OnboardingKnowledge />} />
                <Route path="/onboarding/connect" element={<OnboardingConnect />} />
                {/* Dashboard routes */}
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<DashboardHome />} />
                  <Route path="inbox" element={<Inbox />} />
                  <Route path="ai-training" element={<AiTraining />} />
                  <Route path="model-test" element={<ModelTest />} />
                  <Route path="integrations" element={<Integrations />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Routes>
            </div>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
