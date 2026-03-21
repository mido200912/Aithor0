import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';

const Careers = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const jobs = [
        {
            title: isAr ? 'مطور Backend (Node.js)' : 'Backend Developer (Node.js)',
            type: isAr ? 'دوام كامل | عن بُعد' : 'Full-time | Remote',
            desc: isAr
                ? 'نبحث عن مطور Backend ذو خبرة في Node.js وMongoDB لبناء وتطوير خدمات API خاصة بمنصتنا.'
                : 'We are looking for an experienced Backend developer skilled in Node.js and MongoDB to build and evolve our platform API services.',
        },
        {
            title: isAr ? 'مهندس تعلم آلي (AI/ML)' : 'Machine Learning Engineer (AI/ML)',
            type: isAr ? 'دوام كامل | عن بُعد' : 'Full-time | Remote',
            desc: isAr
                ? 'للانضمام إلى فريق الذكاء الاصطناعي وتطوير نماذج معالجة اللغة الطبيعية (NLP) لدعم اللغة العربية.'
                : 'Join our AI team to develop NLP models with strong support for Arabic language and dialects.',
        },
        {
            title: isAr ? 'مصمم UI/UX' : 'UI/UX Designer',
            type: isAr ? 'دوام جزئي | عن بُعد' : 'Part-time | Remote',
            desc: isAr
                ? 'نبحث عن مصمم موهوب لإنشاء تجارب مستخدم سلسة وجميلة لمنتجاتنا.'
                : 'We are looking for a talented designer to create seamless and beautiful user experiences for our products.',
        },
    ];

    return (
        <div dir={isAr ? 'rtl' : 'ltr'} style={{ padding: '60px 20px', maxWidth: '900px', margin: '0 auto', lineHeight: '1.9', color: 'var(--text-primary)' }}>
            <Link to="/" style={{ color: 'var(--primary-color)', textDecoration: 'none', marginBottom: '30px', display: 'inline-block' }}>
                ← {isAr ? 'العودة للرئيسية' : 'Back to Home'}
            </Link>
            <h1 style={{ fontSize: '2.8rem', fontWeight: 'bold', marginBottom: '10px' }}>
                {isAr ? 'الوظائف' : 'Careers'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '50px', fontSize: '1.1rem' }}>
                {isAr ? 'انضم إلى فريق Aithor وشكّل مستقبل الذكاء الاصطناعي' : 'Join the Aithor team and shape the future of AI'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {jobs.map((job, i) => (
                    <div key={i} style={{
                        padding: '30px', borderRadius: '16px',
                        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                    }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '5px' }}>{job.title}</h2>
                        <span style={{ fontSize: '0.9rem', color: 'var(--primary-color)', fontWeight: '600' }}>{job.type}</span>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>{job.desc}</p>
                        <a href="mailto:aithor049@gmail.com" style={{
                            display: 'inline-block', marginTop: '15px', padding: '8px 20px', borderRadius: '8px',
                            background: 'var(--primary-color)', color: '#fff', textDecoration: 'none', fontWeight: '600'
                        }}>
                            {isAr ? 'قدّم الآن' : 'Apply Now'}
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Careers;
