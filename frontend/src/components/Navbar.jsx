import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { secureStorage } from '../utils/secureStorage';
import './Navbar.css';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeLink, setActiveLink] = useState('home');
    const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://aithor1.vercel.app/api';
    const token = secureStorage.getItem('token');
    const { theme, toggleTheme } = useTheme();
    const { language, toggleLanguage, t } = useLanguage();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setActiveLink(sectionId);
            setIsMobileMenuOpen(false);
        }
    };

    const navigate = useNavigate();

    return (
        <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
            <div className="nav-container">
                <div className="nav-logo" onClick={() => {
                    scrollToSection('home');
                    navigate('/');
                }}>
                    <img src="/logo.png" alt="VOXIO Logo" className="logo-img" />
                    <span className="logo-text">VOXIO</span>
                </div>

                <ul className={`nav-menu ${isMobileMenuOpen ? 'active' : ''}`}>
                    <li>
                        <a
                            href="#home"
                            className={`nav-link ${activeLink === 'home' ? 'active' : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                scrollToSection('home');
                            }}
                        >
                            {t.nav.home}
                        </a>
                    </li>
                    <li>
                        <a
                            href="#features"
                            className={`nav-link ${activeLink === 'features' ? 'active' : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                scrollToSection('features');
                            }}
                        >
                            {t.nav.features}
                        </a>
                    </li>
                    <li>
                        <a
                            href="#how-it-works"
                            className={`nav-link ${activeLink === 'how-it-works' ? 'active' : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                scrollToSection('how-it-works');
                            }}
                        >
                            {t.nav.howItWorks}
                        </a>
                    </li>
                    <li>
                        <a
                            href="#integrations"
                            className={`nav-link ${activeLink === 'integrations' ? 'active' : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                scrollToSection('integrations');
                            }}
                        >
                            {t.nav.integrations}
                        </a>
                    </li>

                    <li>
                        <a
                            href="#contact"
                            className={`nav-link ${activeLink === 'contact' ? 'active' : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                scrollToSection('contact');
                            }}
                        >
                            {t.nav.contact}
                        </a>
                    </li>
                    <li>
                        <a
                            href="/agents"
                            className="nav-link nav-link-agents"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate('/agents');
                                setIsMobileMenuOpen(false);
                            }}
                        >
                             {language === 'ar' ? 'الوكلاء' : 'Agents'}
                        </a>
                    </li>
                    <li className="mobile-only">
                        <div className="mobile-controls">
                            <button
                                className="language-toggle-btn"
                                onClick={toggleLanguage}
                            >
                                {language === 'ar' ? 'English' : 'عربي'}
                            </button>
                            <button
                                className="theme-toggle-btn"
                                onClick={toggleTheme}
                            >
                                {theme === 'light' ? (
                                    <i className="fas fa-moon"></i>
                                ) : (
                                    <i className="fas fa-sun"></i>
                                )}
                            </button>
                        </div>
                    </li>
                    <li className="mobile-only mobile-auth">
                        {token ? (
                            <button className="btn btn-primary btn-block" onClick={() => navigate('/dashboard')}>
                                {t.nav.goDashboard}
                            </button>
                        ) : (
                            <>
                                <button className="btn btn-secondary" onClick={() => navigate('/login')}>{t.nav.login}</button>
                                <button className="btn btn-primary" onClick={() => navigate('/register')}>{t.nav.startFree}</button>
                            </>
                        )}
                    </li>
                </ul>

                <div className="nav-actions">
                    <button
                        className="language-toggle-btn"
                        onClick={toggleLanguage}
                    >
                        {language === 'ar' ? 'English' : 'عربي'}
                    </button>
                    <button
                        className="theme-toggle-btn"
                        onClick={toggleTheme}
                        aria-label="Toggle Theme"
                    >
                        {theme === 'light' ? (
                            <i className="fas fa-moon"></i>
                        ) : (
                            <i className="fas fa-sun"></i>
                        )}
                    </button>
                    <div className="nav-auth-desktop">
                        {token ? (
                            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                                {t.nav.goDashboard}
                            </button>
                        ) : (
                            <>
                                <button className="btn btn-secondary" onClick={() => navigate('/login')}>{t.nav.login}</button>
                                <button className="btn btn-primary" onClick={() => navigate('/register')}>{t.nav.startFree}</button>
                            </>
                        )}
                    </div>
                </div>

                <div
                    className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
