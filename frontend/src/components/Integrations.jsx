import { useLanguage } from '../context/LanguageContext';
import './Integrations.css';

const Integrations = () => {
    const { t, language } = useLanguage();

    const integrations = [
        {
            name: 'WhatsApp Business',
            description: language === 'ar' ? 'تواصل مع عملائك مباشرة عبر التطبيق الأكثر استخداماً في العالم.' : 'Connect with your customers directly via the world\'s most used app.',
            icon: 'fa-whatsapp',
            status: language === 'ar' ? 'متاح الآن' : 'Available Now',
            className: 'whatsapp',
            available: true
        },
        {
            name: 'Instagram DMs',
            description: language === 'ar' ? 'رد تلقائياً على رسائل الدايركت وحول متابعيك إلى عملاء دائمين.' : 'Auto-reply to DMs and turn your followers into loyal customers.',
            icon: 'fa-instagram',
            status: language === 'ar' ? 'متاح الآن' : 'Available Now',
            className: 'instagram',
            available: true
        },
        {
            name: 'Telegram Bot',
            description: language === 'ar' ? 'قم ببناء بوتات ذكية وسريعة لخدمة عملائك على مدار الساعة.' : 'Build smart and fast bots to serve your customers 24/7.',
            icon: 'fa-telegram',
            status: language === 'ar' ? 'متاح الآن' : 'Available Now',
            className: 'telegram',
            available: true
        },
        {
            name: 'Shopify Store',
            description: t.integrations.shopifyDesc,
            icon: 'fa-shopify',
            status: t.integrations.soon,
            className: 'shopify',
            available: false
        },
        {
            name: 'Twitter (X)',
            description: language === 'ar' ? 'قريباً: إدارة الردود والرسائل الخاصة عبر منصة X.' : 'Coming soon: Manage replies and DMs via X platform.',
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
                            className={`integration-card ${!integration.available ? 'coming-soon' : 'active-card'}`}
                        >
                            <div className={`integration-logo ${integration.className}`}>
                                <i className={`fab ${integration.icon}`}></i>
                            </div>
                            <h3>{integration.name}</h3>
                            <p>{integration.description}</p>
                            <span className={`integration-status ${integration.available ? 'status-active' : 'upcoming'}`}>
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
