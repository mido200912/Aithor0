import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { secureStorage } from '../../utils/secureStorage';
import { useToast } from '../../components/Toast';
import WidgetCustomizer from './WidgetCustomizer';
import './WidgetTab.css';
import './WidgetCustomizer.css';

const WidgetTab = () => {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState('install'); // 'install' or 'customize'
    
    const [apiKey, setApiKey] = useState('YOUR_API_KEY');
    
    const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://aithor1.vercel.app/api';
    const CLEAN_BACKEND_URL = BACKEND_URL.replace('/api', '');
    
    useEffect(() => {
        const fetchApiKey = async () => {
            try {
                const token = secureStorage.getItem('token');
                const res = await axios.get(`${BACKEND_URL}/company`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data?.apiKey) {
                    setApiKey(res.data.apiKey);
                }
            } catch (err) {
                console.error("Failed to fetch API key:", err);
            }
        };
        fetchApiKey();
    }, []);

    const widgetCode = `<script 
  src="${CLEAN_BACKEND_URL}/widget.js" 
  data-api-key="${apiKey}"
></script>`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(widgetCode);
        setCopied(true);
        toast.success(
            language === 'ar' ? 'تم النسخ!' : 'Copied!',
            language === 'ar' ? 'تم نسخ الكود إلى الحافظة' : 'Widget code copied to clipboard'
        );
        setTimeout(() => setCopied(false), 2000);
    };

    const steps = [
        {
            title: language === 'ar' ? '1. نسخ الكود' : '1. Copy the Code',
            desc: language === 'ar' 
                ? 'قم بنسخ كود الودجت الفريد الخاص بك الموضح أدناه.' 
                : 'Copy your unique widget code snippet shown below.',
            icon: 'fa-copy'
        },
        {
            title: language === 'ar' ? '2. الإضافة للموقع' : '2. Add to Website',
            desc: language === 'ar' 
                ? 'قم بلصق الكود داخل وسم <head> أو في نهاية وسم <body> في موقعك الإلكتروني.' 
                : 'Paste the code inside the <head> tag or at the end of the <body> tag in your website.',
            icon: 'fa-code'
        },
        {
            title: language === 'ar' ? '3. الحفظ والنشر' : '3. Save & Publish',
            desc: language === 'ar' 
                ? 'احفظ التغييرات وقم بنشر موقعك. سيظهر الشات بوت تلقائياً!' 
                : 'Save the changes and publish your site. The chatbot will appear automatically!',
            icon: 'fa-rocket'
        }
    ];

    return (
        <div className="widget-tab">
            <header className="tab-header">
                <div className="header-content">
                    <motion.h1 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        {language === 'ar' ? 'ودجت الموقع' : 'Web Widget'}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        {language === 'ar' 
                            ? 'أضف ذكاء VOXIO الاصطناعي إلى موقعك الإلكتروني في ثوانٍ معدودة.' 
                            : 'Add VOXIO AI to your website in just a few seconds.'}
                    </motion.p>
                </div>
                
                <div className="tab-switcher">
                    <button className={activeTab === 'install' ? 'active' : ''} onClick={() => setActiveTab('install')}>
                        <i className="fas fa-download"></i>
                        {language === 'ar' ? 'التركيب' : 'Installation'}
                    </button>
                    <button className={activeTab === 'customize' ? 'active' : ''} onClick={() => setActiveTab('customize')}>
                        <i className="fas fa-wand-magic-sparkles"></i>
                        {language === 'ar' ? 'تعديل التصميم بالـ AI' : 'AI Customization'}
                    </button>
                </div>
            </header>

            <AnimatePresence mode="wait">
                {activeTab === 'install' ? (
                    <motion.div 
                        key="install"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="widget-grid"
                    >
                        <div className="widget-main">
                            <section className="setup-steps">
                                <div className="section-title">
                                    <i className="fas fa-list-ol"></i>
                                    <h2>{language === 'ar' ? 'خطوات التركيب' : 'Installation Steps'}</h2>
                                </div>
                                <div className="steps-container">
                                    {steps.map((step, idx) => (
                                        <motion.div 
                                            key={idx}
                                            className="step-card"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                        >
                                            <div className="step-icon">
                                                <i className={`fas ${step.icon}`}></i>
                                            </div>
                                            <div className="step-content">
                                                <h3>{step.title}</h3>
                                                <p>{step.desc}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>

                            <section className="code-section">
                                <div className="section-title">
                                    <i className="fas fa-terminal"></i>
                                    <h2>{language === 'ar' ? 'كود الودجت' : 'Widget Script'}</h2>
                                </div>
                                <div className="code-container">
                                    <div className="code-header">
                                        <span className="file-name">index.html</span>
                                        <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copyToClipboard}>
                                            <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                                            {copied ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'نسخ الكود' : 'Copy Code')}
                                        </button>
                                    </div>
                                    <pre className="code-block">
                                        <code>{widgetCode}</code>
                                    </pre>
                                </div>
                                <div className="code-tip">
                                    <i className="fas fa-lightbulb"></i>
                                    <p>
                                        {language === 'ar' 
                                            ? 'نصيحة: تأكد من وضع الكود في جميع الصفحات التي تريد أن يظهر فيها الشات بوت.' 
                                            : 'Tip: Make sure to place the code on all pages where you want the chatbot to appear.'}
                                    </p>
                                </div>
                            </section>
                        </div>

                        <div className="widget-sidebar">
                            <div className="info-card">
                                <div className="card-icon">
                                    <i className="fas fa-shield-halved"></i>
                                </div>
                                <h3>{language === 'ar' ? 'نطاقات آمنة' : 'Trusted Domains'}</h3>
                                <p>
                                    {language === 'ar' 
                                        ? 'يمكنك تحديد النطاقات المسموح لها بتشغيل الودجت من الإعدادات لزيادة الأمان.' 
                                        : 'You can specify domains allowed to run the widget from settings for extra security.'}
                                </p>
                                <button className="card-link" onClick={() => navigate('/dashboard/settings')}>
                                    {language === 'ar' ? 'إدارة النطاقات' : 'Manage Domains'}
                                    <i className="fas fa-arrow-right"></i>
                                </button>
                            </div>

                            <div className="support-card">
                                <h3>{language === 'ar' ? 'تحتاج مساعدة؟' : 'Need Help?'}</h3>
                                <p>{language === 'ar' ? 'فريقنا متاح لمساعدتك في عملية الربط.' : 'Our team is available to help with integration.'}</p>
                                <a href="mailto:support@voxio.app" className="support-btn">
                                    <i className="fas fa-envelope"></i>
                                    {language === 'ar' ? 'اتصل بالدعم' : 'Contact Support'}
                                </a>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="customize"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <WidgetCustomizer />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WidgetTab;
