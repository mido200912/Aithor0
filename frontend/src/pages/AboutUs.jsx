import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';

const AboutUs = () => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';

    return (
        <div dir={isAr ? 'rtl' : 'ltr'} style={{ padding: '60px 20px', maxWidth: '900px', margin: '0 auto', lineHeight: '1.9', color: 'var(--text-primary)', fontFamily: 'var(--font-ar)' }}>
            <Link to="/" style={{ color: 'var(--primary-color)', textDecoration: 'none', marginBottom: '30px', display: 'inline-block' }}>
                ← {isAr ? 'العودة للرئيسية' : 'Back to Home'}
            </Link>
            <h1 style={{ fontSize: '2.8rem', fontWeight: 'bold', marginBottom: '20px' }}>
                {isAr ? 'من نحن' : 'About Us'}
            </h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '40px' }}>
                {isAr ? 'Aithor — منصة ذكاء اصطناعي متكاملة تُحوِّل طريقة تواصل الشركات مع عملائها.' : 'Aithor — An integrated AI platform that transforms the way companies communicate with their customers.'}
            </p>

            <h2 style={{ fontSize: '1.8rem', fontWeight: '600', marginTop: '40px' }}>
                {isAr ? '🚀 رؤيتنا' : '🚀 Our Vision'}
            </h2>
            <p>
                {isAr
                    ? 'نؤمن بأن كل شركة — كبيرة أو صغيرة — تستحق أدوات ذكاء اصطناعي متطورة تساعدها على النمو. رؤيتنا هي أن يمتلك كل عمل تجاري مساعداً ذكياً يعمل على مدار الساعة لخدمة عملائه باللغة التي يفهمها.'
                    : 'We believe that every company — large or small — deserves advanced AI tools to help it grow. Our vision is for every business to have an intelligent assistant that works around the clock to serve its customers.'}
            </p>

            <h2 style={{ fontSize: '1.8rem', fontWeight: '600', marginTop: '40px' }}>
                {isAr ? '💡 ما الذي نقدمه؟' : '💡 What We Offer'}
            </h2>
            <ul style={{ listStyleType: 'disc', marginLeft: isAr ? '0' : '20px', marginRight: isAr ? '20px' : '0', paddingLeft: '10px' }}>
                <li>{isAr ? 'بوت دردشة مدرَّب على بيانات شركتك' : 'A chatbot trained on your company\'s own data'}</li>
                <li>{isAr ? 'تكامل مع WhatsApp Business، Facebook Messenger، Instagram، وShopify' : 'Integration with WhatsApp Business, Facebook Messenger, Instagram, and Shopify'}</li>
                <li>{isAr ? 'لوحة تحكم ذكية لمتابعة المحادثات والتحليلات' : 'A smart dashboard to monitor conversations and analytics'}</li>
                <li>{isAr ? 'واجهة API مرنة للربط مع أي نظام خارجي' : 'Flexible API for integration with any external system'}</li>
            </ul>

            <h2 style={{ fontSize: '1.8rem', fontWeight: '600', marginTop: '40px' }}>
                {isAr ? '📬 تواصل معنا' : '📬 Contact Us'}
            </h2>
            <p>{isAr ? 'نحن هنا للمساعدة في أي وقت.' : 'We are here to help at any time.'}</p>
            <p><strong>{isAr ? 'البريد الإلكتروني:' : 'Email:'}</strong> aithor049@gmail.com</p>
        </div>
    );
};

export default AboutUs;
