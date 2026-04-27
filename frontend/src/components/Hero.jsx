import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import './Hero.css';
import { BackgroundPaths } from './ui/background-paths';

const Hero = () => {
    const statsRef = useRef(null);
    const { t, language } = useLanguage();
    const { user, isAuthChecked } = useAuth();

    useEffect(() => {
        const animateValue = (element, start, end, duration) => {
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const value = Math.floor(progress * (end - start) + start);
                element.textContent = value;
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                }
            };
            window.requestAnimationFrame(step);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const statNumbers = entry.target.querySelectorAll('.stat-number');
                        statNumbers.forEach((stat) => {
                            const target = parseInt(stat.getAttribute('data-target'));
                            animateValue(stat, 0, target, 2000);
                        });
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.5 }
        );

        if (statsRef.current) {
            observer.observe(statsRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section className="hero relative" id="home">
            <BackgroundPaths />
            
            {/* Premium Glow Effects */}
            <div className="hero-glow hero-glow-1" />
            <div className="hero-glow hero-glow-2" />

            <div className="hero-container relative z-10">
                <div className="hero-content">
                    <div className="hero-badge animate-fade-in">
                        <div className="badge-pulse" />
                        <i className="fas fa-bolt"></i>
                        <span>{t.hero.badge}</span>
                    </div>

                    <h1 className="hero-title animate-slide-up">
                        {t.hero.titleStart}
                        <br />
                        <span className="gradient-text-premium">{t.hero.titleGradient}</span>
                    </h1>

                    <p className="hero-description animate-slide-up delay-1">
                        {t.hero.description}
                    </p>

                    <div className="hero-buttons animate-slide-up delay-2">
                        {isAuthChecked && (
                            user ? (
                                <>
                                    <Link to="/dashboard" className="btn btn-primary-premium btn-large">
                                        <i className="fas fa-tachometer-alt"></i>
                                        {t.nav.goDashboard}
                                        <span className="btn-shine" />
                                    </Link>
                                    <button 
                                        className="btn btn-glass btn-large"
                                        onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                                    >
                                        <i className="fas fa-play-circle"></i>
                                        {t.hero.watchVideo}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to="/register" className="btn btn-primary-premium btn-large">
                                        <i className="fas fa-rocket"></i>
                                        {t.hero.startNow}
                                        <span className="btn-shine" />
                                    </Link>
                                    <button 
                                        className="btn btn-glass btn-large"
                                        onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                                    >
                                        <i className="fas fa-play-circle"></i>
                                        {t.hero.watchVideo}
                                    </button>
                                </>
                            )
                        )}
                    </div>

                    <div className="hero-stats animate-fade-in delay-3" ref={statsRef}>
                        <div className="stat-item">
                            <div className="stat-value">
                                <span className="stat-number" data-target="150">0</span>
                                <span className="stat-suffix">+</span>
                            </div>
                            <span className="stat-label">{t.hero.statCompany}</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-item">
                            <div className="stat-value">
                                <span className="stat-number" data-target="50000">0</span>
                                <span className="stat-suffix">+</span>
                            </div>
                            <span className="stat-label">{t.hero.statConversation}</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-item">
                            <div className="stat-value">
                                <span className="stat-number" data-target="99">0</span>
                                <span className="stat-suffix">%</span>
                            </div>
                            <span className="stat-label">{t.hero.statSatisfaction}</span>
                        </div>
                    </div>
                </div>

                <div className="hero-visual">
                    <div className="hero-mockup">
                        <div className="mockup-header">
                            <div className="mockup-dots">
                                <span /><span /><span />
                            </div>
                            <span className="mockup-title">VOXIO Dashboard</span>
                        </div>
                        <div className="mockup-body">
                            <div className="mock-chat-bubble mock-ai">
                                <div className="mock-avatar"><i className="fas fa-robot" /></div>
                                <div className="mock-text">
                                    {language === 'ar' ? 'مرحباً! أنا VOXIO 👋 كيف يمكنني مساعدتك؟' : 'Hi! I\'m VOXIO 👋 How can I help you?'}
                                </div>
                            </div>
                            <div className="mock-chat-bubble mock-user">
                                <div className="mock-text">
                                    {language === 'ar' ? 'أريد تفعيل البوت على واتساب' : 'I want to activate the bot on WhatsApp'}
                                </div>
                            </div>
                            <div className="mock-chat-bubble mock-ai">
                                <div className="mock-avatar"><i className="fas fa-robot" /></div>
                                <div className="mock-text">
                                    {language === 'ar' ? 'بالتأكيد! اذهب إلى لوحة التحكم > التكاملات > واتساب 🚀' : 'Sure! Go to Dashboard > Integrations > WhatsApp 🚀'}
                                </div>
                            </div>
                            <div className="mock-typing">
                                <span /><span /><span />
                            </div>
                        </div>
                    </div>

                    <div className="floating-card card-1 animate-float">
                        <i className="fab fa-whatsapp"></i>
                        <span>WhatsApp</span>
                        <div className="card-status active" />
                    </div>
                    <div className="floating-card card-2 animate-float delay-1">
                        <i className="fas fa-brain"></i>
                        <span>{t.hero.cardChatbot}</span>
                    </div>
                    <div className="floating-card card-3 animate-float delay-2">
                        <i className="fas fa-chart-line"></i>
                        <span>{t.hero.cardAnalytics}</span>
                    </div>
                </div>
            </div>

            <div className="scroll-indicator">
                <div className="mouse">
                    <div className="wheel"></div>
                </div>
                <span>{t.hero.scrollMore}</span>
            </div>
        </section>
    );
};

export default Hero;
