import { useLanguage } from '../context/LanguageContext';
import './HowItWorks.css';

const HowItWorks = () => {
    const { t } = useLanguage();

    const steps = [
        {
            number: '01',
            icon: 'fa-user-plus',
            title: t.howItWorks.step1Title,
            description: t.howItWorks.step1Desc
        },
        {
            number: '02',
            icon: 'fa-building',
            title: t.howItWorks.step2Title,
            description: t.howItWorks.step2Desc
        },
        {
            number: '03',
            icon: 'fa-link',
            title: t.howItWorks.step3Title,
            description: t.howItWorks.step3Desc
        },
        {
            number: '04',
            icon: 'fa-rocket',
            title: t.howItWorks.step4Title,
            description: t.howItWorks.step4Desc
        }
    ];

    return (
        <section className="how-it-works" id="how-it-works">
            <div className="container">
                <div className="section-header">
                    <span className="section-badge">{t.howItWorks.badge}</span>
                    <h2 className="section-title">
                        {t.howItWorks.titleStart} <span className="gradient-text">Aithor</span>?
                    </h2>
                    <p className="section-description">
                        {t.howItWorks.description}
                    </p>
                </div>

                <div className="steps-container">
                    {steps.map((step, index) => (
                        <div key={index} className="step-wrapper">
                            <div className="step-item">
                                <div className="step-number">{step.number}</div>
                                <div className="step-icon">
                                    <i className={`fas ${step.icon}`}></i>
                                </div>
                                <h3 className="step-title">{step.title}</h3>
                                <p className="step-description">{step.description}</p>
                            </div>
                            {index < steps.length - 1 && <div className="step-connector"></div>}
                        </div>
                    ))}
                </div>

                <div className="demo-container">
                    <div className="demo-video">
                        <div className="video-placeholder">
                            <i className="fas fa-play-circle"></i>
                            <span>{t.howItWorks.watchDemo}</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
