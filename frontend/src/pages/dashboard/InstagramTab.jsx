import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { secureStorage } from '../../utils/secureStorage';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://aithor1.vercel.app/api';

const InstagramTab = () => {
    const { language } = useLanguage();
    const isArabic = language === 'ar';
    const token = secureStorage.getItem('token');

    const [mainTab, setMainTab] = useState('chatbot'); // 'chatbot', 'comments'
    const [loading, setLoading] = useState(false);

    // Chatbot Rules
    const [chatbotRules, setChatbotRules] = useState([]);
    const [newChatbotRule, setNewChatbotRule] = useState({ trigger: '', response: '' });

    // Comment Rules
    const [globalCommentRules, setGlobalCommentRules] = useState([]);
    const [newGlobalRule, setNewGlobalRule] = useState({ keyword: '', commentReply: '', dmReply: '' });
    
    // Fallback DM closed
    const [dmClosedFallback, setDmClosedFallback] = useState('');

    // Fetch integration settings
    useEffect(() => {
        fetchInstagramSettings();
    }, []);

    const fetchInstagramSettings = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/integration-manager/instagram/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const settings = res.data.settings || {};
            setChatbotRules(settings.chatbotRules || []);
            setGlobalCommentRules(settings.globalCommentRules || []);
            setDmClosedFallback(settings.dmClosedFallback || '');
        } catch (e) {
            console.error('Error fetching Instagram settings:', e);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (newSettingsObj) => {
        try {
            await axios.put(`${BACKEND_URL}/integration-manager/instagram/settings`, newSettingsObj, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Show toast or something
        } catch (e) {
            console.error('Error saving settings:', e);
        }
    };

    // Chatbot actions
    const addChatbotRule = () => {
        if (!newChatbotRule.trigger || !newChatbotRule.response) return;
        const updated = [...chatbotRules, newChatbotRule];
        setChatbotRules(updated);
        setNewChatbotRule({ trigger: '', response: '' });
        saveSettings({ chatbotRules: updated });
    };

    const removeChatbotRule = (idx) => {
        const updated = chatbotRules.filter((_, i) => i !== idx);
        setChatbotRules(updated);
        saveSettings({ chatbotRules: updated });
    };

    // Global Comment actions
    const addGlobalRule = () => {
        if (!newGlobalRule.keyword || !newGlobalRule.commentReply || !newGlobalRule.dmReply) return;
        const updated = [...globalCommentRules, newGlobalRule];
        setGlobalCommentRules(updated);
        setNewGlobalRule({ keyword: '', commentReply: '', dmReply: '' });
        saveSettings({ globalCommentRules: updated });
    };

    const removeGlobalRule = (idx) => {
        const updated = globalCommentRules.filter((_, i) => i !== idx);
        setGlobalCommentRules(updated);
        saveSettings({ globalCommentRules: updated });
    };

    const saveDmFallback = () => {
        saveSettings({ dmClosedFallback });
        alert(isArabic ? 'تم الحفظ!' : 'Saved!');
    };

    const s = {
        wrapper: { padding: '24px', fontFamily: 'inherit', direction: isArabic ? 'rtl' : 'ltr' },
        header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' },
        icon: { width: '52px', height: '52px', borderRadius: '14px', background: '#E4405F15', color: '#E4405F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' },
        mainTabs: { display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px', width: 'fit-content', marginBottom: '24px' },
        mainTab: (active) => ({
            padding: '8px 22px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            fontWeight: active ? '600' : '400', fontSize: '0.92rem',
            background: active ? 'var(--bg-primary)' : 'transparent',
            color: active ? '#E4405F' : 'var(--text-secondary)',
            boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s'
        }),
        card: { background: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-color)', marginBottom: '20px' },
        input: { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', marginBottom: '10px' },
        btn: { padding: '12px 20px', borderRadius: '10px', border: 'none', background: '#E4405F', color: 'white', cursor: 'pointer', fontWeight: '600' }
    };

    return (
        <div style={s.wrapper}>
            <div style={s.header}>
                <div style={s.icon}><i className="fab fa-instagram" /></div>
                <div>
                    <h1 style={{ fontSize: '1.7rem', color: 'var(--text-primary)', margin: 0 }}>
                        {isArabic ? 'إنستاجرام' : 'Instagram'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                        {isArabic ? 'إدارة رسائل الأوتوميشن والتعليقات' : 'Manage automations and auto-replies'}
                    </p>
                </div>
            </div>

            <div style={s.mainTabs}>
                <button style={s.mainTab(mainTab === 'chatbot')} onClick={() => setMainTab('chatbot')}>
                    <i className="fas fa-robot" style={{ marginInlineEnd: '6px' }} />
                    {isArabic ? 'شات بوت (للرسائل)' : 'Chatbot (DMs)'}
                </button>
                <button style={s.mainTab(mainTab === 'comments')} onClick={() => setMainTab('comments')}>
                    <i className="fas fa-comment-dots" style={{ marginInlineEnd: '6px' }} />
                    {isArabic ? 'الرد التلقائي على التعليقات' : 'Comment Auto-Reply'}
                </button>
            </div>

            {loading ? <p>Loading...</p> : (
                <AnimatePresence mode="wait">
                    {mainTab === 'chatbot' && (
                        <motion.div key="chatbot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div style={s.card}>
                                <h3>{isArabic ? 'قواعد الشات بوت' : 'Chatbot Rules'}</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    {isArabic ? 'رد تلقائي عند استلام كلمة معينة في الخاص.' : 'Auto reply when a specific word is received in DM.'}
                                </p>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 100px', gap: '10px', marginTop: '20px' }}>
                                    <input placeholder={isArabic ? 'الكلمة المفتاحية' : 'Keyword'} value={newChatbotRule.trigger} onChange={e => setNewChatbotRule({...newChatbotRule, trigger: e.target.value})} style={s.input} />
                                    <input placeholder={isArabic ? 'الرد (رسالة)' : 'Reply message'} value={newChatbotRule.response} onChange={e => setNewChatbotRule({...newChatbotRule, response: e.target.value})} style={s.input} />
                                    <button onClick={addChatbotRule} style={s.btn}>{isArabic ? 'إضافة' : 'Add'}</button>
                                </div>

                                <div style={{ marginTop: '20px' }}>
                                    {chatbotRules.map((r, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-primary)', borderRadius: '10px', marginBottom: '8px' }}>
                                            <div><strong>{r.trigger}</strong>: {r.response}</div>
                                            <button onClick={() => removeChatbotRule(i)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}><i className="fas fa-trash" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {mainTab === 'comments' && (
                        <motion.div key="comments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            
                            {/* Fallback Message */}
                            <div style={s.card}>
                                <h3>{isArabic ? 'رسالة بديلة (في حال الخاص مغلق)' : 'Fallback Message (If DM is closed)'}</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    {isArabic ? 'لو العميل قافلรับ رسائل الخاص، يترد عليه في الكومنت بالرسالة دي.' : 'If the user has DMs closed, reply to their comment with this.'}
                                </p>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input style={s.input} value={dmClosedFallback} onChange={e => setDmClosedFallback(e.target.value)} placeholder={isArabic ? 'مثال: نرجو فتح الرسائل الخاصة لنتواصل معك.' : 'e.g., Please open your DMs so we can message you.'} />
                                    <button onClick={saveDmFallback} style={s.btn}>{isArabic ? 'حفظ' : 'Save'}</button>
                                </div>
                            </div>

                            {/* Global Rules */}
                            <div style={s.card}>
                                <h3>{isArabic ? 'قواعد عامة لأي منشور/فيديو' : 'Global Rules for Any Post/Reel'}</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    {isArabic ? 'إذا كتب شخص هذه الكلمة في أي تعليق، أرسل له بالخاص والتعليق.' : 'If someone comments this word on ANY post, reply to comment and send DM.'}
                                </p>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 100px', gap: '10px', marginTop: '20px' }}>
                                    <input placeholder={isArabic ? 'الكلمة (مثل: تفاصيل)' : 'Keyword (e.g., details)'} value={newGlobalRule.keyword} onChange={e => setNewGlobalRule({...newGlobalRule, keyword: e.target.value})} style={s.input} />
                                    <input placeholder={isArabic ? 'الرد في التعليق' : 'Comment Reply'} value={newGlobalRule.commentReply} onChange={e => setNewGlobalRule({...newGlobalRule, commentReply: e.target.value})} style={s.input} />
                                    <input placeholder={isArabic ? 'الرد في الخاص (DM)' : 'DM Message'} value={newGlobalRule.dmReply} onChange={e => setNewGlobalRule({...newGlobalRule, dmReply: e.target.value})} style={s.input} />
                                    <button onClick={addGlobalRule} style={s.btn}>{isArabic ? 'إضافة' : 'Add'}</button>
                                </div>

                                <div style={{ marginTop: '20px' }}>
                                    {globalCommentRules.map((r, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-primary)', borderRadius: '10px', marginBottom: '8px', border: '1px solid var(--border-color)' }}>
                                            <div>
                                                <div><strong>{isArabic ? 'لكلمة' : 'Keyword'}:</strong> {r.keyword}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><strong>{isArabic ? 'التعليق' : 'Comment'}:</strong> {r.commentReply}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#E4405F' }}><strong>{isArabic ? 'الخاص' : 'DM'}:</strong> {r.dmReply}</div>
                                            </div>
                                            <button onClick={() => removeGlobalRule(i)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}><i className="fas fa-trash" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div style={s.card}>
                                <h3>{isArabic ? 'تخصيص الرد لفيديو/منشور معين' : 'Video/Post Specific Rules'}</h3>
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', background: 'var(--bg-primary)', borderRadius: '10px' }}>
                                    <i className="fas fa-video" style={{ fontSize: '32px', marginBottom: '10px', color: '#ccc' }} />
                                    <p>{isArabic ? 'سيتم جلب جميع مقاطع الفيديو الخاصة بك هنا لاحقاً.' : 'All your videos and posts will be listed here later.'}</p>
                                </div>
                            </div>

                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
};

export default InstagramTab;
