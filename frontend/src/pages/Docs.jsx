import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';

const Docs = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    return (
        <div dir={isAr ? 'rtl' : 'ltr'} style={{ padding: '60px 20px', maxWidth: '900px', margin: '0 auto', lineHeight: '1.9', color: 'var(--text-primary)' }}>
            <Link to="/" style={{ color: 'var(--primary-color)', textDecoration: 'none', marginBottom: '30px', display: 'inline-block' }}>
                ← {isAr ? 'العودة للرئيسية' : 'Back to Home'}
            </Link>
            <h1 style={{ fontSize: '2.8rem', fontWeight: 'bold', marginBottom: '10px' }}>
                {isAr ? 'الوثائق والـ API' : 'Docs & API'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', fontSize: '1.1rem' }}>
                {isAr ? 'دليل شامل لاستخدام Aithor API ودمجه في تطبيقاتك' : 'A comprehensive guide to using and integrating the Aithor API in your applications.'}
            </p>

            <h2 style={{ fontSize: '1.8rem', fontWeight: '600', marginTop: '30px' }}>
                {isAr ? '🔗 رابط الـ Base URL' : '🔗 Base URL'}
            </h2>
            <pre style={{ background: 'var(--card-bg)', padding: '15px', borderRadius: '10px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
                https://aithor0.vercel.app/api
            </pre>

            <h2 style={{ fontSize: '1.8rem', fontWeight: '600', marginTop: '40px' }}>
                📡 {isAr ? 'إرسال رسالة للبوت (POST)' : 'Send a message to the bot (POST)'}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}><strong>POST</strong> /public/chat</p>
            <pre style={{ background: 'var(--card-bg)', padding: '15px', borderRadius: '10px', border: '1px solid var(--border-color)', overflowX: 'auto', fontSize: '0.9rem' }}>
{`{
  "apiKey": "YOUR_API_KEY",
  "message": "مرحبا، ما هي منتجاتكم؟",
  "conversationId": "optional-id"
}`}
            </pre>

            <h2 style={{ fontSize: '1.8rem', fontWeight: '600', marginTop: '40px' }}>
                🔑 {isAr ? 'كيف أحصل على Aithor API Key؟' : 'How to get your Aithor API Key?'}
            </h2>
            <ol style={{ paddingRight: isAr ? '20px' : '0', paddingLeft: isAr ? '0' : '20px' }}>
                <li>{isAr ? 'سجّل الدخول إلى لوحة التحكم.' : 'Login to the Dashboard.'}</li>
                <li>{isAr ? 'اذهب إلى صفحة "الإعدادات".' : 'Go to the "Settings" page.'}</li>
                <li>{isAr ? 'ستجد مفتاح الـ API الخاص بك في قسم "مفتاح الربط".' : 'You will find your API Key under the "API Key" section.'}</li>
            </ol>

            <h2 style={{ fontSize: '1.8rem', fontWeight: '600', marginTop: '40px' }}>
                📬 {isAr ? 'هل لديك سؤال؟' : 'Have a Question?'}
            </h2>
            <p>{isAr ? 'تواصل معنا على:' : 'Contact us at:'} <strong>aithor049@gmail.com</strong></p>
        </div>
    );
};

export default Docs;
