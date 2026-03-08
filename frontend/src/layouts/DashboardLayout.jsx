import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import './DashboardLayout.css';

const DashboardLayout = () => {
    const { t, language, toggleLanguage } = useLanguage();
    const { logout, user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const isActive = (path) => {
        return location.pathname === path ? 'active' : '';
    };

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <img src="/logo.png" alt="Aithor" className="sidebar-logo" />
                    {isSidebarOpen && <span className="logo-text">Aithor</span>}
                </div>

                <div className="sidebar-user">
                    <div className="user-avatar">
                        <span>{user?.name?.[0]?.toUpperCase() || 'U'}</span>
                    </div>
                    {isSidebarOpen && (
                        <div className="user-info">
                            <span className="user-name">{user?.name || 'User'}</span>
                            <span className="user-role">Admin</span>
                        </div>
                    )}
                </div>

                <nav className="sidebar-nav">
                    <ul>
                        <li>
                            <Link to="/dashboard" className={`nav-item ${isActive('/dashboard')}`}>
                                <i className="fas fa-home"></i>
                                {isSidebarOpen && <span>{t.dashboard.home}</span>}
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/inbox" className={`nav-item ${isActive('/dashboard/inbox')}`}>
                                <i className="fas fa-inbox"></i>
                                {isSidebarOpen && <span>{t.dashboard.inbox}</span>}
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/ai-training" className={`nav-item ${isActive('/dashboard/ai-training')}`}>
                                <i className="fas fa-brain"></i>
                                {isSidebarOpen && <span>{t.dashboard.training}</span>}
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/model-test" className={`nav-item ${isActive('/dashboard/model-test')}`}>
                                <i className="fas fa-robot"></i>
                                {isSidebarOpen && <span>{t.dashboard.modelTest}</span>}
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/integrations" className={`nav-item ${isActive('/dashboard/integrations')}`}>
                                <i className="fas fa-plug"></i>
                                {isSidebarOpen && <span>{t.dashboard.integrations}</span>}
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/settings" className={`nav-item ${isActive('/dashboard/settings')}`}>
                                <i className="fas fa-cog"></i>
                                {isSidebarOpen && <span>{t.dashboard.settings}</span>}
                            </Link>
                        </li>
                    </ul>
                </nav>

                <div className="sidebar-footer">
                    <button onClick={logout} className="nav-item logout-btn">
                        <i className="fas fa-sign-out-alt"></i>
                        {isSidebarOpen && <span>{t.dashboard.logout}</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <button className="toggle-btn" onClick={toggleSidebar}>
                        <i className={`fas fa-${isSidebarOpen ? 'outdent' : 'indent'}`}></i>
                    </button>

                    <div className="header-actions">
                        <button className="lang-btn" onClick={toggleLanguage}>
                            {language === 'ar' ? 'English' : 'عربي'}
                        </button>
                        <button className="theme-btn" onClick={toggleTheme}>
                            {theme === 'light' ? <i className="fas fa-moon"></i> : <i className="fas fa-sun"></i>}
                        </button>
                    </div>
                </header>

                <div className="dashboard-content">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="dashboard-content-inner"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
