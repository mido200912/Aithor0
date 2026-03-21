import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';

const Support = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    return (
        <div dir={isAr ? 'rtl' : 'ltr'} style={{ padding: '60px 20px', maxWidth: '900px', margin: '0 auto', lineHeight: '1.9', color: 'var(--text-primary)' }}>
            <Link to="/" style={{ color: 'var(--primary-color)', textDecoration: 'none', marginBottom: '30px', display: 'inline-block' }}>
                ← {isAr ? 'العودة للرئيسية' : 'Back to Home'}
            </Link>
            <h1 style={{ fontSize: '2.8rem', fontWeight: 'bold', marginBottom: '10px' }}>
                {isAr ? 'الدعم الفني' : 'Support'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', fontSize: '1.1rem' }}>
                {isAr ? 'فريقنا جاهز لمساعدتك في أي وقت' : 'Our team is ready to help you at any time.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px', marginBottom: '50px' }}>
                <div style={{ padding: '30px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📧</div>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>{isAr ? 'البريد الإلكتروني' : 'Email Support'}</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>
                        {isAr ? 'راسلنا وسنرد خلال 24 ساعة' : 'Email us and we\'ll respond within 24 hours.'}
                    </p>
                    <a href="mailto:aithor049@gmail.com" style={{ color: 'var(--primary-color)', fontWeight: '600', textDecoration: 'none' }}>
                        aithor049@gmail.com
                    </a>
                </div>
                <div style={{ padding: '30px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>💬</div>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>{isAr ? 'المحادثة الفورية' : 'Live Chat'}</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>
                        {isAr ? 'تحدث مع بوتنا الذكي الآن من الصفحة الرئيسية' : 'Chat with our AI bot now from the Home page.'}
                    </p>
                    <Link to="/" style={{ color: 'var(--primary-color)', fontWeight: '600', textDecoration: 'none' }}>
                        {isAr ? 'الذهاب للرئيسية' : 'Go to Home'}
                    </Link>
                </div>
            </div>

            <h2 style={{ fontSize: '1.8rem', fontWeight: '600', marginTop: '20px' }}>
                {isAr ? '❓ الأسئلة الشائعة' : '❓ FAQ'}
            </h2>
            {[
                {
                    q: isAr ? 'كيف أبدأ استخدام Aithor؟' : 'How do I start using Aithor?',
                    a: isAr ? 'قم بالتسجيل وإنشاء حساب، ثم أضف بيانات شركتك وابدأ في الربط مع قنوات التواصل.' : 'Register and create an account, then add your company data and start connecting with communication channels.'
                },
                {
                    q: isAr ? 'هل يدعم البوت اللغة العربية؟' : 'Does the bot support Arabic?',
                    a: isAr ? 'نعم، البوت يدعم العربية والإنجليزية بشكل كامل.' : 'Yes, the bot fully supports both Arabic and English.'
                },
                {
                    q: isAr ? 'كيف أتحصل على مفتاح API الخاص بي؟' : 'How do I get my API key?',
                    a: isAr ? 'بعد تسجيل الدخول، اذهب لصفحة الإعدادات وستجد مفتاح الـ API جاهزاً.' : 'After logging in, go to the Settings page and you will find your API key ready.'
                },
            ].map((item, i) => (
                <div key={i} style={{ marginTop: '25px', padding: '20px 25px', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontWeight: '700', marginBottom: '8px' }}>{item.q}</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{item.a}</p>
                </div>
            ))}
        </div>
    );
};

export default Support;
