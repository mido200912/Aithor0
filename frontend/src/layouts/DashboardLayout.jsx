import { Suspense, useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';  
import { secureStorage } from '../utils/secureStorage';
import { useGetCompanyQuery, useGetIntegrationsQuery } from '../store/dashboardApi';
import './DashboardLayout.css';

const DashboardRouteFallback = () => (
    <div className="dashboard-route-loader" role="status" aria-live="polite">
        <span className="dashboard-route-loader__spinner" aria-hidden="true"></span>
        <span>Loading...</span>
    </div>
);

const DashboardLayout = () => {
    const { t, language, toggleLanguage } = useLanguage();
    const { logout, user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
    const [activeIntegrations, setActiveIntegrations] = useState([]);
    const hasToken = Boolean(secureStorage.getItem('token'));
    const companyQuery = useGetCompanyQuery(undefined, { skip: !hasToken });
    const integrationsQuery = useGetIntegrationsQuery(undefined, { skip: !hasToken });

    // ─── Handle VOXIO_* commands from widget iframe ──────────────────────────────
    useEffect(() => {
        const handleMessage = (event) => {
            if (!event.data || typeof event.data.type !== 'string') return;
            if (!event.data.type.startsWith('VOXIO_')) return;

            const { type, target, selector } = event.data;

            if (type === 'VOXIO_NAVIGATE') {
                if (!target) return;
                if (target.startsWith('#')) {
                    const el = document.querySelector(target);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else if (target.startsWith('/')) {
                    window.location.href = target;
                } else {
                    window.location.href = target;
                }
            }

            if (type === 'VOXIO_SCROLL') {
                if (!selector) return;
                const el = document.querySelector(selector);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }

            if (type === 'VOXIO_CLICK') {
                if (!selector) return;
                const el = document.querySelector(selector);
                if (el) {
                    el.click();
                }
            }

            if (type === 'VOXIO_HIGHLIGHT') {
                if (!selector) return;
                const el = document.querySelector(selector);
                if (!el) return;

                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('voxio-copilot-highlight');

                setTimeout(() => {
                    el.classList.remove('voxio-copilot-highlight');
                }, 4000);
            }

            if (type === 'VOXIO_FILL') {
                if (!selector || !event.data.value) return;
                const el = document.querySelector(selector);
                if (el) {
                    el.focus();
                    el.value = event.data.value;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        if (companyQuery.error?.status === 404) {
            window.location.href = '/onboarding/profile';
        }
    }, [companyQuery.error]);

    useEffect(() => {
        if (!integrationsQuery.data) return;

        const platforms = integrationsQuery.data.map((integration) =>
            integration.platform.toLowerCase(),
        );
        setActiveIntegrations(platforms);
    }, [integrationsQuery.data]);

    useEffect(() => {
        const refreshIntegrations = () => integrationsQuery.refetch();

        window.addEventListener('integrationsUpdated', refreshIntegrations);
        return () => window.removeEventListener('integrationsUpdated', refreshIntegrations);
    }, [integrationsQuery]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const handleNavItemClick = () => {
        if (window.innerWidth <= 768) setIsSidebarOpen(false);
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';
    const isRailActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    const isArabic = language === 'ar';

    return (
        <div className="dashboard-layout">
            {/* ── Icon Rail (Narrow Left Bar) ── */}
            <div className="icon-rail">
                <img
                    src={theme === 'dark' ? '/logodark.png' : '/logo.png'}
                    alt="V"
                    className="icon-rail-logo"
                />
                <button
                    className={`icon-rail-btn ${isRailActive('/dashboard') && location.pathname === '/dashboard' ? 'active' : ''}`}
                    onClick={() => { window.location.href = '/dashboard'; }}
                    title={t.dashboard.home}
                >
                    <i className="fas fa-home"></i>
                </button>
                <button
                    className={`icon-rail-btn ${isRailActive('/dashboard/analytics') ? 'active' : ''}`}
                    onClick={() => { window.location.href = '/dashboard/analytics'; }}
                    title={isArabic ? 'التحليلات' : 'Analytics'}
                >
                    <i className="fas fa-chart-line"></i>
                </button>
                <button
                    className={`icon-rail-btn ${isRailActive('/dashboard/conversations') ? 'active' : ''}`}
                    onClick={() => { window.location.href = '/dashboard/conversations'; }}
                    title={isArabic ? 'المحادثات' : 'Conversations'}
                >
                    <i className="fas fa-comments"></i>
                </button>
                <button
                    className={`icon-rail-btn ${isRailActive('/dashboard/ai-copilot') ? 'active' : ''}`}
                    onClick={() => { window.location.href = '/dashboard/ai-copilot'; }}
                    title={isArabic ? 'مساعد AI' : 'AI Copilot'}
                    style={{ color: isRailActive('/dashboard/ai-copilot') ? '#a855f7' : undefined }}
                >
                    <i className="fas fa-magic"></i>
                </button>

                <div className="icon-rail-spacer"></div>

                <button
                    className={`icon-rail-btn ${isRailActive('/dashboard/settings') ? 'active' : ''}`}
                    onClick={() => { window.location.href = '/dashboard/settings'; }}
                    title={t.dashboard.settings}
                >
                    <i className="fas fa-cog"></i>
                </button>
                <button className="icon-rail-btn" onClick={toggleTheme} title="Toggle Theme">
                    {theme === 'light' ? <i className="fas fa-moon"></i> : <i className="fas fa-sun"></i>}
                </button>
            </div>

            {/* ── Mobile Overlay ── */}
            {isSidebarOpen && (
                <div className="sidebar-overlay mobile-only" onClick={() => setIsSidebarOpen(false)}></div>
            )}

            {/* ── Sidebar ── */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                {/* Mobile header */}
                <div className="sidebar-header mobile-only">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                            src={theme === 'dark' ? '/logodark.png' : '/logo.png'}
                            alt="VOXIO"
                            className="sidebar-logo"
                            style={{ width: '30px', height: '30px', objectFit: 'contain' }}
                        />
                        <span style={{ fontWeight: 800, color: 'var(--dash-text)', fontSize: '1rem', fontFamily: 'var(--font-dash)' }}>VOXIO</span>
                    </div>
                    <button className="close-sidebar-btn mobile-only" onClick={() => setIsSidebarOpen(false)}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* User info */}
                <div className="sidebar-user">
                    <div className="user-avatar">
                        <span>{user?.name?.[0]?.toUpperCase() || 'U'}</span>
                    </div>
                    {isSidebarOpen && (
                        <>
                            <div className="user-info">
                                <span className="user-name">{user?.name || 'User'}</span>
                                <span className="user-role">{isArabic ? 'مشرف' : 'Admin'}</span>
                            </div>
                            <span className="user-badge">PRO</span>
                        </>
                    )}
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    <ul>
                        <li>
                            <Link to="/dashboard" className={`nav-item ${isActive('/dashboard')}`} onClick={handleNavItemClick}>
                                <i className="fas fa-th-large"></i>
                                {isSidebarOpen && <span>{t.dashboard.home}</span>}
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/orders" className={`nav-item ${isActive('/dashboard/orders')}`} onClick={handleNavItemClick}>
                                <i className="fas fa-shopping-cart"></i>
                                {isSidebarOpen && <span>{isArabic ? 'الطلبات' : 'Orders'}</span>}
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/leads" className={`nav-item ${isActive('/dashboard/leads')}`} onClick={handleNavItemClick}>
                                <i className="fas fa-user-friends"></i>
                                {isSidebarOpen && <span>{isArabic ? 'العملاء المحتملين' : 'Leads'}</span>}
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/products" className={`nav-item ${isActive('/dashboard/products')}`} onClick={handleNavItemClick}>
                                <i className="fas fa-box"></i>
                                {isSidebarOpen && <span>{isArabic ? 'المنتجات' : 'Products'}</span>}
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/conversations" className={`nav-item ${isActive('/dashboard/conversations')}`} onClick={handleNavItemClick}>
                                <i className="fas fa-comments"></i>
                                {isSidebarOpen && <span>{isArabic ? 'المحادثات والردود' : 'Conversations'}</span>}
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/analytics" className={`nav-item ${isActive('/dashboard/analytics')}`} onClick={handleNavItemClick}>
                                <i className="fas fa-chart-line"></i>
                                {isSidebarOpen && <span>{isArabic ? 'التحليلات' : 'Analytics'}</span>}
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/team" className={`nav-item ${isActive('/dashboard/team')}`} onClick={handleNavItemClick}>
                                <i className="fas fa-users"></i>
                                {isSidebarOpen && <span>{isArabic ? 'الفريق' : 'Team'}</span>}
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/ai-training" className={`nav-item ${isActive('/dashboard/ai-training')}`} onClick={handleNavItemClick}>
                                <i className="fas fa-brain"></i>
                                {isSidebarOpen && <span>{t.dashboard.training}</span>}
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/model-test" className={`nav-item ${isActive('/dashboard/model-test')}`} onClick={handleNavItemClick}>
                                <i className="fas fa-flask"></i>
                                {isSidebarOpen && <span>{t.dashboard.modelTest}</span>}
                            </Link>
                        </li>

                        {/* ── AI Copilot — Special Item ── */}
                        <li>
                            <Link to="/dashboard/ai-copilot" className={`nav-item nav-item-copilot ${isActive('/dashboard/ai-copilot')}`} onClick={handleNavItemClick}>
                                <i className="fas fa-magic"></i>
                                {isSidebarOpen && (
                                    <>
                                        <span>{isArabic ? 'مساعد AI' : 'AI Copilot'}</span>
                                        <span style={{ marginInlineStart: 'auto', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '5px', background: 'rgba(168,85,247,0.15)', color: '#a855f7', fontWeight: 700, letterSpacing: '0.04em' }}>NEW</span>
                                    </>
                                )}
                            </Link>
                        </li>

                        <li>
                            <Link to="/dashboard/integrations" className={`nav-item ${isActive('/dashboard/integrations')}`} onClick={handleNavItemClick}>
                                <i className="fas fa-plug"></i>
                                {isSidebarOpen && (
                                    <>
                                        <span>{t.dashboard.integrations}</span>
                                        {activeIntegrations.length > 0 && <span className="integration-dot"></span>}
                                    </>
                                )}
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/widget" className={`nav-item nav-item-website ${isActive('/dashboard/widget')}`} onClick={handleNavItemClick}>
                                <i className="fas fa-code"></i>
                                {isSidebarOpen && <span>{isArabic ? 'ودجت الموقع' : 'Website Widget'}</span>}
                            </Link>
                        </li>
                        {activeIntegrations.includes('whatsapp') && (
                        <li>
                            <Link to="/dashboard/whatsapp" className={`nav-item nav-item-whatsapp ${isActive('/dashboard/whatsapp')}`} onClick={handleNavItemClick}>
                                <i className="fab fa-whatsapp"></i>
                                {isSidebarOpen && <span>{isArabic ? 'واتساب' : 'WhatsApp'}</span>}
                            </Link>
                        </li>
                        )}
                        {activeIntegrations.includes('whatsapp') && (
                        <li>
                            <Link to="/dashboard/whatsapp-bulk" className={`nav-item ${isActive('/dashboard/whatsapp-bulk')}`} onClick={handleNavItemClick} style={{ color: isActive('/dashboard/whatsapp-bulk') ? '#25D366' : undefined }}>
                                <i className="fas fa-paper-plane"></i>
                                {isSidebarOpen && <span>{isArabic ? 'إرسال جماعي' : 'Bulk Sender'}</span>}
                            </Link>
                        </li>
                        )}
                        {activeIntegrations.includes('instagram') && (
                        <li>
                            <Link to="/dashboard/instagram" className={`nav-item nav-item-instagram ${isActive('/dashboard/instagram')}`} onClick={handleNavItemClick}>
                                <i className="fab fa-instagram"></i>
                                {isSidebarOpen && <span>{isArabic ? 'إنستاجرام' : 'Instagram'}</span>}
                            </Link>
                        </li>
                        )}
                        {activeIntegrations.includes('telegram') && (
                        <li>
                            <Link to="/dashboard/telegram" className={`nav-item nav-item-telegram ${isActive('/dashboard/telegram')}`} onClick={handleNavItemClick}>
                                <i className="fab fa-telegram-plane"></i>
                                {isSidebarOpen && <span>{isArabic ? 'تليجرام' : 'Telegram'}</span>}
                            </Link>
                        </li>
                        )}
                        {activeIntegrations.includes('website') && (
                        <li>
                            <Link to="/dashboard/website-chat" className={`nav-item ${isActive('/dashboard/website-chat')}`} onClick={handleNavItemClick}>
                                <i className="fas fa-globe"></i>
                                {isSidebarOpen && <span>{isArabic ? 'موقع الويب (URL)' : 'Website (URL)'}</span>}
                            </Link>
                        </li>
                        )}

                        <li>
                            <Link to="/dashboard/settings" className={`nav-item ${isActive('/dashboard/settings')}`} onClick={handleNavItemClick}>
                                <i className="fas fa-cog"></i>
                                {isSidebarOpen && <span>{t.dashboard.settings}</span>}
                            </Link>
                        </li>
                        <li>
                            <a href="https://voxio.gitbook.io" target="_blank" rel="noopener noreferrer" className="nav-item" onClick={handleNavItemClick}>
                                <i className="fas fa-question-circle"></i>
                                {isSidebarOpen && (
                                    <>
                                        <span>{isArabic ? 'مركز المساعدة' : 'Help Center'}</span>
                                        <i className="fas fa-external-link-alt" style={{ fontSize: '0.6rem', marginInlineStart: 'auto', opacity: 0.4 }}></i>
                                    </>
                                )}
                            </a>
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

            {/* ── Main Content ── */}
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
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                            className="dashboard-content-inner"
                        >
                            <Suspense fallback={<DashboardRouteFallback />}>
                                <Outlet />
                            </Suspense>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* ── Mobile Bottom Nav Bar ── */}
            <nav className="mobile-bottom-nav mobile-only">
                <Link to="/dashboard" className={`mobile-nav-btn ${isActive('/dashboard')}`}>
                    <i className="fas fa-home"></i>
                    <span>{isArabic ? 'الرئيسية' : 'Home'}</span>
                </Link>
                <Link to="/dashboard/conversations" className={`mobile-nav-btn ${isActive('/dashboard/conversations')}`}>
                    <i className="fas fa-comments"></i>
                    <span>{isArabic ? 'المحادثات' : 'Chats'}</span>
                </Link>
                <Link to="/dashboard/analytics" className={`mobile-nav-btn ${isActive('/dashboard/analytics')}`}>
                    <i className="fas fa-chart-line"></i>
                    <span>{isArabic ? 'التحليلات' : 'Analytics'}</span>
                </Link>
                <Link to="/dashboard/ai-copilot" className={`mobile-nav-btn ${isActive('/dashboard/ai-copilot')}`} style={{ color: isActive('/dashboard/ai-copilot') ? '#a855f7' : undefined }}>
                    <i className="fas fa-magic"></i>
                    <span>AI</span>
                </Link>
                <button className="mobile-nav-btn" onClick={toggleSidebar}>
                    <i className="fas fa-bars"></i>
                    <span>{isArabic ? 'المزيد' : 'More'}</span>
                </button>
            </nav>

        </div>
    );
};

export default DashboardLayout;
