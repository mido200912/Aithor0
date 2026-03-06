import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import './Hero.css';

const Hero = () => {
    const statsRef = useRef(null);
    const { t } = useLanguage();
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
        <section className="hero" id="home">
            <div className="hero-container">
                <div className="hero-content">
                    <div className="hero-badge animate-fade-in">
                        <i className="fas fa-sparkles"></i>
                        <span>{t.hero.badge}</span>
                    </div>

                    <h1 className="hero-title animate-slide-up">
                        {t.hero.titleStart}
                        <br />
                        <span className="gradient-text">{t.hero.titleGradient}</span>
                    </h1>

                    <p className="hero-description animate-slide-up delay-1">
                        {t.hero.description}
                    </p>

                    <div className="hero-buttons animate-slide-up delay-2">
                        {isAuthChecked && (
                            user ? (
                                // مستخدم مسجل دخول - عرض زر Dashboard
                                <>
                                    <Link to="/dashboard" className="btn btn-primary btn-large">
                                        <i className="fas fa-tachometer-alt"></i>
                                        الدخول للوحة التحكم
                                    </Link>
                                    <button className="btn btn-outline btn-large">
                                        <i className="fas fa-play-circle"></i>
                                        {t.hero.watchVideo}
                                    </button>
                                </>
                            ) : (
                                // مستخدم غير مسجل - عرض أزرار التسجيل
                                <>
                                    <Link to="/register" className="btn btn-primary btn-large">
                                        <i className="fas fa-rocket"></i>
                                        {t.hero.startNow}
                                    </Link>
                                    <Link to="/login" className="btn btn-outline btn-large">
                                        <i className="fas fa-sign-in-alt"></i>
                                        تسجيل الدخول
                                    </Link>
                                </>
                            )
                        )}
                    </div>

                    <div className="hero-stats animate-fade-in delay-3" ref={statsRef}>
                        <div className="stat-item">
                            <span className="stat-number" data-target="500">
                                0
                            </span>
                            <span className="stat-suffix">+</span>
                            <span className="stat-label">{t.hero.statCompany}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number" data-target="10000">
                                0
                            </span>
                            <span className="stat-suffix">+</span>
                            <span className="stat-label">{t.hero.statConversation}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number" data-target="99">
                                0
                            </span>
                            <span className="stat-suffix">%</span>
                            <span className="stat-label">{t.hero.statSatisfaction}</span>
                        </div>
                    </div>
                </div>

                <div className="hero-visual">
                    <div className="floating-card card-1 animate-float">
                        <i className="fas fa-robot"></i>
                        <span>{t.hero.cardChatbot}</span>
                    </div>
                    <div className="floating-card card-2 animate-float delay-1">
                        <i className="fas fa-comments"></i>
                        <span>{t.hero.cardMessages}</span>
                    </div>
                    <div className="floating-card card-3 animate-float delay-2">
                        <i className="fas fa-chart-line"></i>
                        <span>{t.hero.cardAnalytics}</span>
                    </div>
                    <div className="floating-card card-4 animate-float delay-3">
                        <i className="fas fa-link"></i>
                        <span>{t.hero.cardIntegration}</span>
                    </div>

                    <div className="hero-illustration">
                        <div className="gradient-orb orb-1"></div>
                        <div className="gradient-orb orb-2"></div>
                        <div className="gradient-orb orb-3"></div>
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
