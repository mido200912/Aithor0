import { useLanguage } from '../context/LanguageContext';
import './Pricing.css';

const Pricing = () => {
    const { t } = useLanguage();

    const plans = [
        {
            name: t.pricing.starter.name,
            price: '0',
            period: t.pricing.month,
            description: t.pricing.starter.desc,
            features: [
                { text: t.pricing.starter.features[0], enabled: true },
                { text: t.pricing.starter.features[1], enabled: true },
                { text: t.pricing.starter.features[2], enabled: true },
                { text: t.pricing.starter.features[3], enabled: false },
                { text: t.pricing.starter.features[4], enabled: false }
            ],
            buttonText: t.pricing.startFree,
            buttonClass: 'btn-outline',
            popular: false
        },
        {
            name: t.pricing.pro.name,
            price: '49',
            period: t.pricing.month,
            description: t.pricing.pro.desc,
            features: [
                { text: t.pricing.pro.features[0], enabled: true },
                { text: t.pricing.pro.features[1], enabled: true },
                { text: t.pricing.pro.features[2], enabled: true },
                { text: t.pricing.pro.features[3], enabled: true },
                { text: t.pricing.pro.features[4], enabled: true }
            ],
            buttonText: t.pricing.subscribe,
            buttonClass: 'btn-primary',
            popular: true
        },
        {
            name: t.pricing.enterprise.name,
            price: '199',
            period: t.pricing.month,
            description: t.pricing.enterprise.desc,
            features: [
                { text: t.pricing.enterprise.features[0], enabled: true },
                { text: t.pricing.enterprise.features[1], enabled: true },
                { text: t.pricing.enterprise.features[2], enabled: true },
                { text: t.pricing.enterprise.features[3], enabled: true },
                { text: t.pricing.enterprise.features[4], enabled: true }
            ],
            buttonText: t.pricing.contactUs,
            buttonClass: 'btn-outline',
            popular: false
        }
    ];

    return (
        <section className="pricing" id="pricing">
            <div className="container">
                <div className="section-header">
                    <span className="section-badge">{t.pricing.badge}</span>
                    <h2 className="section-title">
                        {t.pricing.titleStart} <span className="gradient-text">{t.pricing.titleGradient}</span>
                    </h2>
                    <p className="section-description">
                        {t.pricing.description}
                    </p>
                </div>

                <div className="pricing-grid">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`pricing-card ${plan.popular ? 'popular' : ''}`}
                        >
                            {plan.popular && <div className="popular-badge">{t.pricing.mostPopular}</div>}
                            <h3 className="plan-name">{plan.name}</h3>
                            <div className="plan-price">
                                <span className="currency">$</span>
                                <span className="amount">{plan.price}</span>
                                <span className="period">{plan.period}</span>
                            </div>
                            <p className="plan-description">{plan.description}</p>
                            <ul className="plan-features">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className={!feature.enabled ? 'disabled' : ''}>
                                        <i className={`fas ${feature.enabled ? 'fa-check' : 'fa-times'}`}></i>{' '}
                                        {feature.text}
                                    </li>
                                ))}
                            </ul>
                            <button className={`btn ${plan.buttonClass} btn-block`}>
                                {plan.buttonText}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Pricing;
