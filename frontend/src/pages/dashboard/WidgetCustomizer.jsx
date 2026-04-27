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
    const isArabic = language === 'ar';
    
    const [activeTab, setActiveTab] = useState('settings'); // 'settings', 'ai', 'embed'
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Default config fallback
    const defaultConfig = { 
        primaryColor: '#6C63FF', 
        welcomeMessage: isArabic ? 'مرحباً! كيف يمكنني مساعدتك؟' : 'Hello! How can I help you?',
        customCss: ''
    };
    const [config, setConfig] = useState(defaultConfig);
    const [isSaving, setIsSaving] = useState(false);
    const [aiProcessing, setAiProcessing] = useState(false);
    
    const messagesEndRef = useRef(null);

    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        fetchCurrentConfig();
    }, []);

    useEffect(() => {
        if (activeTab === 'ai') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activeTab]);

    const fetchCurrentConfig = async () => {
        try {
            const token = secureStorage.getItem('token');
            // Fetch the whole company to get the API key and widget config
            const res = await axios.get(`${BACKEND_URL}/company`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                setApiKey(res.data.apiKey);
                if (res.data.widgetConfig) {
                    setConfig({ ...defaultConfig, ...res.data.widgetConfig });
                }
            }
            setMessages([{
                id: 1,
                role: 'ai',
                content: isArabic 
                    ? 'أنا مصمم الودجت الخاص بك. أخبرني كيف تريد تغيير شكل الودجت العائم؟ (مثلاً: "غير لون الفقاعة للأزرق" أو "اجعل الخط أكبر")' 
                    : 'I am your Widget Architect. How would you like to style the floating bubble? (e.g., "Change bubble to blue")'
            }]);
        } catch (err) { console.error("Error fetching config:", err); }
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            const token = secureStorage.getItem('token');
            // We can reuse the edit endpoint by passing a specific command, or create a save endpoint.
            // Wait, there's no manual save endpoint for widget config in backend yet!
            // I'll create one or simulate saving for now.
            // Actually, I can use the existing update logic if I send a direct update.
            // Let's use the company update endpoint.
            await axios.post(`${BACKEND_URL}/company`, { widgetConfig: config }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(isArabic ? 'تم حفظ الإعدادات' : 'Settings saved');
        } catch (err) {
            console.error(err);
            toast.error(isArabic ? 'فشل الحفظ' : 'Failed to save');
        } finally {
            setIsSaving(false);
        }
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
            toast.error(isArabic ? 'فشل الاتصال' : 'Connection failed');
        } finally { setLoading(false); setAiProcessing(false); }
    };

    // Use current origin so it works flawlessly in local development
    const queryParams = new URLSearchParams({
        color: config.primaryColor || '',
        welcome: config.welcomeMessage || '',
        css: config.customCss || '',
        t: Date.now()
    }).toString();
    const previewUrl = apiKey ? `${window.location.origin}/widget/${apiKey}?${queryParams}` : '';

    const embedCode = `<script 
  src="${BACKEND_URL.replace('/api', '')}/widget.js" 
  data-api-key="${apiKey}" 
  data-primary-color="${config.primaryColor}">
</script>`;

    const copyEmbedCode = () => {
        navigator.clipboard.writeText(embedCode);
        toast.success(isArabic ? 'تم نسخ الكود!' : 'Code copied!');
    };

    const styles = {
        tabsHeader: { display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' },
        tabBtn: (active) => ({
            padding: '10px 20px', background: active ? 'var(--color-primary)' : 'transparent',
            color: active ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s'
        }),
        contentArea: { background: 'var(--color-card-bg)', borderRadius: '12px', padding: '24px', border: '1px solid var(--color-border)', minHeight: '400px' },
        inputGroup: { marginBottom: '20px' },
        label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-primary)' },
        input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--text-primary)' },
        colorPickerWrap: { display: 'flex', alignItems: 'center', gap: '15px' },
        colorInput: { width: '50px', height: '50px', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: 0 },
        codeBlock: { background: '#1e293b', padding: '20px', borderRadius: '12px', color: '#e2e8f0', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left' }
    };

    return (
        <div className="widget-customizer" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '30px', alignItems: 'start' }}>
            <div className="customizer-controls">
                <div style={styles.tabsHeader}>
                    <button style={styles.tabBtn(activeTab === 'settings')} onClick={() => setActiveTab('settings')}>
                        <i className="fas fa-sliders-h"></i> {isArabic ? 'الإعدادات اليدوية' : 'Manual Settings'}
                    </button>
                    <button style={styles.tabBtn(activeTab === 'ai')} onClick={() => setActiveTab('ai')}>
                        <i className="fas fa-magic"></i> {isArabic ? 'مصمم الذكاء الاصطناعي' : 'AI Designer'}
                    </button>
                    <button style={styles.tabBtn(activeTab === 'embed')} onClick={() => setActiveTab('embed')}>
                        <i className="fas fa-code"></i> {isArabic ? 'كود التضمين' : 'Embed Code'}
                    </button>
                </div>

                <div style={styles.contentArea}>
                    <AnimatePresence mode="wait">
                        {activeTab === 'settings' && (
                            <motion.div key="settings" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0}}>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>{isArabic ? 'اللون الأساسي' : 'Primary Color'}</label>
                                    <div style={styles.colorPickerWrap}>
                                        <input 
                                            type="color" 
                                            value={config.primaryColor || '#6C63FF'} 
                                            onChange={e => setConfig({...config, primaryColor: e.target.value})}
                                            style={styles.colorInput}
                                        />
                                        <input 
                                            type="text" 
                                            value={config.primaryColor || '#6C63FF'} 
                                            onChange={e => setConfig({...config, primaryColor: e.target.value})}
                                            style={{...styles.input, width: '120px'}}
                                        />
                                    </div>
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>{isArabic ? 'رسالة الترحيب الافتراضية' : 'Default Welcome Message'}</label>
                                    <textarea 
                                        rows={3}
                                        value={config.welcomeMessage || ''} 
                                        onChange={e => setConfig({...config, welcomeMessage: e.target.value})}
                                        style={styles.input}
                                        placeholder={isArabic ? 'مرحباً! كيف أساعدك؟' : 'Hello! How can I help?'}
                                    />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>{isArabic ? 'أكواد CSS إضافية (متقدم)' : 'Custom CSS (Advanced)'}</label>
                                    <textarea 
                                        rows={5}
                                        value={config.customCss || ''} 
                                        onChange={e => setConfig({...config, customCss: e.target.value})}
                                        style={{...styles.input, fontFamily: 'monospace', direction: 'ltr', textAlign: 'left'}}
                                        placeholder=".vx-bubble { border-radius: 0; }"
                                    />
                                </div>
                                <button 
                                    onClick={handleSaveSettings} 
                                    disabled={isSaving}
                                    style={{...styles.tabBtn(true), width: '100%', justifyContent: 'center', padding: '15px'}}
                                >
                                    {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save"></i> {isArabic ? 'حفظ الإعدادات' : 'Save Settings'}</>}
                                </button>
                            </motion.div>
                        )}

                        {activeTab === 'ai' && (
                            <motion.div key="ai" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="ai-chat-view" style={{height: '500px', display: 'flex', flexDirection: 'column'}}>
                                <div className="chat-messages" style={{flex: 1, overflowY: 'auto', padding: '10px', background: 'var(--color-bg)', borderRadius: '12px', marginBottom: '15px'}}>
                                    {messages.map(m => (
                                        <div key={m.id} className={`chat-bubble ${m.role}`} style={{padding: '12px 18px', margin: '8px 0', borderRadius: '18px', background: m.role === 'user' ? 'var(--color-primary)' : 'var(--color-card-bg)', color: m.role === 'user' ? '#fff' : 'var(--text-primary)', maxWidth: '80%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', float: m.role === 'user' ? (isArabic ? 'left' : 'right') : (isArabic ? 'right' : 'left'), clear: 'both'}}>
                                            {m.content}
                                        </div>
                                    ))}
                                    {loading && <div style={{clear: 'both', padding: '10px'}}><i className="fas fa-spinner fa-spin"></i></div>}
                                    <div ref={messagesEndRef} />
                                </div>
                                <form className="chat-input" onSubmit={handleSendMessage} style={{display: 'flex', gap: '10px'}}>
                                    <input 
                                        placeholder={isArabic ? 'اطلب تعديل الودجت...' : 'Describe widget change...'} 
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        style={{...styles.input, flex: 1}}
                                    />
                                    <button type="submit" disabled={!input.trim() || loading} style={styles.tabBtn(true)}>
                                        <i className="fas fa-paper-plane"></i>
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {activeTab === 'embed' && (
                            <motion.div key="embed" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0}}>
                                <h3 style={{marginBottom: '15px', color: 'var(--text-primary)'}}>
                                    {isArabic ? 'ضع هذا الكود في موقعك' : 'Put this code in your website'}
                                </h3>
                                <p style={{color: 'var(--text-secondary)', marginBottom: '20px'}}>
                                    {isArabic ? 'انسخ الكود التالي وضعه قبل إغلاق وسم </body> في صفحات موقعك.' : 'Copy the code below and paste it before the closing </body> tag in your website.'}
                                </p>
                                <div style={{position: 'relative'}}>
                                    <pre style={styles.codeBlock}>
                                        <code>{embedCode}</code>
                                    </pre>
                                    <button 
                                        onClick={copyEmbedCode}
                                        style={{position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer'}}
                                    >
                                        <i className="fas fa-copy"></i>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="customizer-preview" style={{ background: 'var(--color-card-bg)', borderRadius: '12px', padding: '20px', border: '1px solid var(--color-border)', position: 'sticky', top: '20px' }}>
                <div className="preview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <span style={{fontWeight: 'bold', fontSize: '1.2rem'}}>{isArabic ? 'معاينة حية' : 'Live Preview'}</span>
                    <div className="preview-status" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.9rem', fontWeight: 'bold' }}>
                        <span className="live-dot" style={{width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite'}}></span>
                        Live
                    </div>
                </div>
                <div className="preview-window widget-preview-mode" style={{ position: 'relative', width: '100%', height: '550px', background: '#f8fafc', borderRadius: '24px', overflow: 'hidden', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)', border: '4px solid #e2e8f0' }}>
                    {apiKey ? (
                        <iframe 
                            key={JSON.stringify(config)} 
                            src={previewUrl} 
                            title="Widget Preview" 
                            style={{width: '100%', height: '100%', border: 'none'}}
                        />
                    ) : (
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8'}}>
                            Loading preview...
                        </div>
                    )}
                    
                    <AnimatePresence>
                        {aiProcessing && (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="ai-working-overlay"
                                style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}
                            >
                                <div style={{fontSize: '2rem', color: 'var(--color-primary)', marginBottom: '15px'}}><i className="fas fa-magic fa-bounce"></i></div>
                                <p style={{fontWeight: 'bold', color: 'var(--text-primary)'}}>{isArabic ? 'جاري تحديث الودجت...' : 'Updating Widget...'}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            <style>{`
                @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
                @media (max-width: 1024px) { .widget-customizer { grid-template-columns: 1fr !important; } }
            `}</style>
        </div>
    );
};

export default WidgetCustomizer;
