import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { secureStorage } from '../../utils/secureStorage';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../components/Toast';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://aithor1.vercel.app/api';

const WidgetCustomizer = () => {
    const { language } = useLanguage();
    const { toast } = useToast();
    
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState({ primaryColor: '#6C63FF', welcomeMessage: '', customCss: '' });
    const [aiProcessing, setAiProcessing] = useState(false);
    
    const messagesEndRef = useRef(null);
    const iframeRef = useRef(null);

    const user = secureStorage.getItem('user');
    const apiKey = user?.apiKey || user?.chatToken || '';

    useEffect(() => {
        fetchCurrentConfig();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchCurrentConfig = async () => {
        try {
            const token = secureStorage.getItem('token');
            const res = await axios.get(`${BACKEND_URL}/widget-editor/current`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConfig(res.data);
            setMessages([{
                id: 1,
                role: 'ai',
                content: language === 'ar' 
                    ? 'أنا مصمم الودجت الخاص بك. أخبرني كيف تريد تغيير شكل الودجت العائم؟ (مثلاً: "غير لون الفقاعة للأزرق" أو "اجعل الخط أكبر")' 
                    : 'I am your Widget Architect. How would you like to style the floating bubble? (e.g., "Change bubble to blue" or "Make font larger")'
            }]);
        } catch (err) { console.error(err); }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { id: Date.now(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        const request = input;
        setInput('');
        setLoading(true);
        setAiProcessing(true);

        try {
            const token = secureStorage.getItem('token');
            const res = await axios.post(
                `${BACKEND_URL}/widget-editor/edit`,
                { userRequest: request, history: messages },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.config) {
                setConfig(res.data.config);
            }
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', content: res.data.message || 'Updated! ✅' }]);
        } catch (err) { 
            console.error(err);
            toast.error(language === 'ar' ? 'فشل الاتصال' : 'Connection failed');
        } finally { setLoading(false); setAiProcessing(false); }
    };

    const currentOrigin = window.location.origin;
    const previewUrl = apiKey 
        ? `${BACKEND_URL.replace('/api', '')}/widget/${apiKey}?t=${Date.now()}`
        : '';

    return (
        <div className="widget-customizer">
            <div className="customizer-layout">
                <div className="customizer-controls">
                    <div className="control-tabs">
                        <button className="active">
                            <i className="fas fa-magic"></i>
                            {language === 'ar' ? 'مصمم الودجت بالـ AI' : 'AI Widget Designer'}
                        </button>
                    </div>

                    <div className="tab-content">
                        <div className="ai-chat-view">
                            <div className="chat-messages">
                                {messages.map(m => (
                                    <div key={m.id} className={`chat-bubble ${m.role}`}>
                                        {m.content}
                                    </div>
                                ))}
                                {loading && <div className="chat-bubble ai loading-dots"><span></span><span></span><span></span></div>}
                                <div ref={messagesEndRef} />
                            </div>
                            <form className="chat-input" onSubmit={handleSendMessage}>
                                <input 
                                    placeholder={language === 'ar' ? 'اطلب تعديل الودجت...' : 'Describe widget change...'} 
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                />
                                <button type="submit" disabled={!input.trim() || loading}>
                                    <i className="fas fa-paper-plane"></i>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="customizer-preview">
                    <div className="preview-header">
                        <span>{language === 'ar' ? 'معاينة الودجت' : 'Widget Preview'}</span>
                        <div className="preview-status">
                            <span className="live-dot"></span>
                            Live
                        </div>
                    </div>
                    <div className="preview-window widget-preview-mode">
                        <iframe key={JSON.stringify(config)} src={previewUrl} title="Widget Preview" />
                        <AnimatePresence>
                            {aiProcessing && (
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="ai-working-overlay"
                                >
                                    <div className="magic-loader"></div>
                                    <p>{language === 'ar' ? 'جاري تحديث الودجت...' : 'Updating Widget...'}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    
                    <div className="config-summary">
                        <div className="summary-item">
                            <span>Color:</span>
                            <div className="color-preview" style={{ background: config.primaryColor }}></div>
                            <code>{config.primaryColor}</code>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WidgetCustomizer;
