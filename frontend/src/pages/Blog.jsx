import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';

const Blog = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const posts = [
        {
            title: isAr ? 'كيف يُحوِّل الذكاء الاصطناعي خدمة العملاء؟' : 'How AI is Transforming Customer Service?',
            date: isAr ? 'مارس 2026' : 'March 2026',
            desc: isAr
                ? 'اكتشف كيف أصبحت الشركات الرائدة تستخدم الـ Chatbots المدربة على بياناتها الخاصة لتوفير تجربة عملاء استثنائية.'
                : 'Discover how leading companies are using chatbots trained on their own data to deliver exceptional customer experiences.',
        },
        {
            title: isAr ? 'ربط موقعك بـ WhatsApp Business في 5 خطوات' : 'Connect Your Website to WhatsApp Business in 5 Steps',
            date: isAr ? 'فبراير 2026' : 'February 2026',
            desc: isAr
                ? 'دليل مفصل خطوة بخطوة لربط متجرك أو موقعك بواتساب بيزنس باستخدام Aithor API.'
                : 'A detailed step-by-step guide to connecting your store or website to WhatsApp Business using the Aithor API.',
        },
        {
            title: isAr ? 'مستقبل التجارة الإلكترونية مع الذكاء الاصطناعي' : 'The Future of E-commerce with AI',
            date: isAr ? 'يناير 2026' : 'January 2026',
            desc: isAr
                ? 'تقرير شامل عن كيفية تحويل تقنيات الذكاء الاصطناعي لقطاع التجارة الإلكترونية في المنطقة العربية.'
                : 'A comprehensive report on how AI technologies are transforming the e-commerce sector.',
        },
    ];

    return (
        <div dir={isAr ? 'rtl' : 'ltr'} style={{ padding: '60px 20px', maxWidth: '900px', margin: '0 auto', lineHeight: '1.9', color: 'var(--text-primary)' }}>
            <Link to="/" style={{ color: 'var(--primary-color)', textDecoration: 'none', marginBottom: '30px', display: 'inline-block' }}>
                ← {isAr ? 'العودة للرئيسية' : 'Back to Home'}
            </Link>
            <h1 style={{ fontSize: '2.8rem', fontWeight: 'bold', marginBottom: '10px' }}>
                {isAr ? 'المدونة' : 'Blog'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '50px', fontSize: '1.1rem' }}>
                {isAr ? 'أحدث المقالات والأخبار من فريق Aithor' : 'Latest articles and news from the Aithor team'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {posts.map((post, i) => (
                    <div key={i} style={{
                        padding: '30px', borderRadius: '16px',
                        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                    }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--primary-color)', fontWeight: '600' }}>{post.date}</span>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: '10px 0' }}>{post.title}</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>{post.desc}</p>
                        <button style={{
                            marginTop: '15px', padding: '8px 20px', borderRadius: '8px',
                            background: 'var(--primary-color)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600'
                        }}>
                            {isAr ? 'اقرأ المزيد' : 'Read More'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Blog;
