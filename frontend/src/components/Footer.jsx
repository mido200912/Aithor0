import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
    const { t } = useLanguage();

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-section">
                        <div className="footer-logo">
                            <img src="/logo.png" alt="Aithor Logo" />
                            <span>Aithor</span>
                        </div>
                        <p>{t.footer.description}</p>
                    </div>

                    <div className="footer-section">
                        <h4>{t.footer.quickLinks}</h4>
                        <ul>
                            <li><a href="/#home">{t.nav.home}</a></li>
                            <li><a href="/#features">{t.nav.features}</a></li>
                            <li><a href="/#pricing">{t.nav.pricing}</a></li>
                            <li><a href="/#contact">{t.nav.contact}</a></li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4>{t.footer.product}</h4>
                        <ul>
                            <li><a href="/#integrations">{t.nav.integrations}</a></li>
                            <li><Link to="/docs">{t.footer.docs}</Link></li>
                            <li><Link to="/docs">API</Link></li>
                            <li><Link to="/support">{t.footer.support}</Link></li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4>{t.footer.company}</h4>
                        <ul>
                            <li><Link to="/about">{t.footer.aboutUs}</Link></li>
                            <li><Link to="/blog">{t.footer.blog}</Link></li>
                            <li><Link to="/careers">{t.footer.careers}</Link></li>
                            <li><Link to="/terms">{t.footer.terms}</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; 2026 Aithor. {t.footer.rights}</p>
                    <div className="footer-links">
                        <Link to="/privacy">{t.footer.privacy}</Link>
                        <Link to="/terms">{t.footer.terms}</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
