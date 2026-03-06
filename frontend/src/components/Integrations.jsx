import { useLanguage } from '../context/LanguageContext';
import './Integrations.css';

const Integrations = () => {
    const { t } = useLanguage();

    const integrations = [
        {
            name: 'Facebook Messenger',
            description: t.integrations.messengerDesc,
            icon: 'fa-facebook-f',
            status: t.integrations.available,
            className: 'facebook',
            available: true
        },
        {
            name: 'Instagram DMs',
            description: t.integrations.instagramDesc,
            icon: 'fa-instagram',
            status: t.integrations.available,
            className: 'instagram',
            available: true
        },
        {
            name: 'WhatsApp Business',
            description: t.integrations.whatsappDesc,
            icon: 'fa-whatsapp',
            status: t.integrations.available,
            className: 'whatsapp',
            available: true
        },
        {
            name: 'Shopify',
            description: t.integrations.shopifyDesc,
            icon: 'fa-shopify',
            status: t.integrations.available,
            className: 'shopify',
            available: true
        },
        {
            name: 'Telegram',
            description: t.integrations.soon,
            icon: 'fa-telegram',
            status: t.integrations.soon,
            className: 'telegram',
            available: false
        },
        {
            name: 'Twitter (X)',
            description: t.integrations.soon,
            icon: 'fa-twitter',
            status: t.integrations.soon,
            className: 'twitter',
            available: false
        }
    ];

    return (
        <section className="integrations" id="integrations">
            <div className="container">
                <div className="section-header">
                    <span className="section-badge">{t.integrations.badge}</span>
                    <h2 className="section-title">
                        {t.integrations.titleStart} <span className="gradient-text">{t.integrations.titleGradient}</span>
                    </h2>
                    <p className="section-description">
                        {t.integrations.description}
                    </p>
                </div>

                <div className="integrations-grid">
                    {integrations.map((integration, index) => (
                        <div
                            key={index}
                            className={`integration-card ${!integration.available ? 'coming-soon' : ''}`}
                        >
                            <div className={`integration-logo ${integration.className}`}>
                                <i className={`fab ${integration.icon}`}></i>
                            </div>
                            <h3>{integration.name}</h3>
                            <p>{integration.description}</p>
                            <span className={`integration-status ${!integration.available ? 'upcoming' : ''}`}>
                                {integration.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Integrations;
