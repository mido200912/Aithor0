import { useLanguage } from '../context/LanguageContext';
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
                            <li>
                                <a href="#home">{t.nav.home}</a>
                            </li>
                            <li>
                                <a href="#features">{t.nav.features}</a>
                            </li>
                            <li>
                                <a href="#pricing">{t.nav.pricing}</a>
                            </li>
                            <li>
                                <a href="#contact">{t.nav.contact}</a>
                            </li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4>{t.footer.product}</h4>
                        <ul>
                            <li>
                                <a href="#">{t.nav.integrations}</a>
                            </li>
                            <li>
                                <a href="#">{t.footer.docs}</a>
                            </li>
                            <li>
                                <a href="#">API</a>
                            </li>
                            <li>
                                <a href="#">{t.footer.support}</a>
                            </li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4>{t.footer.company}</h4>
                        <ul>
                            <li>
                                <a href="#">{t.footer.aboutUs}</a>
                            </li>
                            <li>
                                <a href="#">{t.footer.blog}</a>
                            </li>
                            <li>
                                <a href="#">{t.footer.careers}</a>
                            </li>
                            <li>
                                <a href="#">{t.footer.terms}</a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; 2026 Aithor. {t.footer.rights}</p>
                    <div className="footer-links">
                        <a href="#">{t.footer.privacy}</a>
                        <a href="#">{t.footer.terms}</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
