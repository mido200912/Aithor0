import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { secureStorage } from '../../utils/secureStorage';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://aithor1.vercel.app/api';

const WhatsappTab = () => {
    const { language } = useLanguage();
    const isArabic = language === 'ar';
    const token = secureStorage.getItem('token');

    const [mainTab, setMainTab] = useState('chats');  // 'requests' | 'chats'
    const [requests, setRequests] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('');
    const [chats, setChats] = useState([]);          // unique users (chat IDs)
    const [activeChatUser, setActiveChatUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chatsLoading, setChatsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => { 
        fetchRequests();
        const interval = setInterval(fetchRequests, 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => { 
        if (mainTab === 'chats') {
            fetchChats();
            const interval = setInterval(fetchChats, 15000);
            return () => clearInterval(interval);
        }
    }, [mainTab]);

    useEffect(() => { 
        if (activeChatUser) {
            fetchMessages(activeChatUser);
            const interval = setInterval(() => fetchMessages(activeChatUser), 10000);
            return () => clearInterval(interval);
        }
    }, [activeChatUser]);

    useEffect(() => { 
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
    }, [messages]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/company/requests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter out non-WhatsApp requests. 
            // In Voxio, WhatsApp requests might be labeled with source/platform 'whatsapp'
            const waRequests = res.data.filter(r => r.source === 'whatsapp' || (r.platform && r.platform === 'whatsapp'));
            const reversed = [...waRequests].reverse();
            setRequests(reversed);
            const unique = [...new Set(reversed.map(r => r.product || 'عام'))];
            setCategories(unique);
            if (unique.length > 0 && !activeCategory) setActiveCategory(unique[0]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchChats = async () => {
        setChatsLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/support-chat/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter whatsapp only
            const waChats = res.data.filter(c => c.platform === 'whatsapp');
            setChats(waChats);
            if (waChats.length > 0 && !activeChatUser) setActiveChatUser(waChats[0].id);
        } catch (e) {
            console.error(e);
        } finally {
            setChatsLoading(false);
        }
    };

    const fetchMessages = async (userId) => {
        try {
            const res = await axios.get(`${BACKEND_URL}/support-chat/history/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const formatTime = (val) => {
        if (!val) return '';
        const d = val?._seconds ? new Date(val._seconds * 1000) : new Date(val);
        return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatFullDate = (val) => {
        if (!val) return '';
        const d = val?._seconds ? new Date(val._seconds * 1000) : new Date(val);
        return isNaN(d.getTime()) ? '' : d.toLocaleString();
    };

    // ─── STYLES ──────────────────────────────────────────────────────────
    const s = {
        wrapper: { padding: '24px', fontFamily: 'inherit', direction: isArabic ? 'rtl' : 'ltr' },
        header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' },
        icon: { width: '52px', height: '52px', borderRadius: '14px', background: '#25D36615', color: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' },
        mainTabs: { display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px', width: 'fit-content', marginBottom: '24px' },
        mainTab: (active) => ({
            padding: '8px 22px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            fontWeight: active ? '600' : '400', fontSize: '0.92rem',
            background: active ? 'var(--bg-primary)' : 'transparent',
            color: active ? '#25D366' : 'var(--text-secondary)',
            boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s'
        }),
        chatLayout: { display: 'flex', gap: '0', height: '560px', border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' },
        sidebar: { width: '280px', borderInlineEnd: '1px solid var(--border-color)', overflowY: 'auto', background: 'var(--bg-secondary)', flexShrink: 0 },
        userItem: (active) => ({
            padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
            background: active ? '#25D36615' : 'transparent',
            borderInlineStart: active ? '4px solid #25D366' : '4px solid transparent',
            transition: 'background 0.15s'
        }),
        messagesArea: { flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' },
        messagesBody: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'cover', backgroundBlendMode: 'soft-light' },
        bubble: (sender) => ({
            maxWidth: '75%', padding: '10px 14px', borderRadius: '12px',
            background: sender === 'user' ? '#d9fdd3' : 'white',
            color: '#111b21',
            alignSelf: sender === 'user' ? 'flex-end' : 'flex-start',
            fontSize: '0.92rem', lineHeight: '1.5', wordBreak: 'break-word',
            boxShadow: '0 1px 1px rgba(0,0,0,0.1)'
        }),
    };

    return (
        <div style={s.wrapper}>
            <div style={s.header}>
                <div style={s.icon}><i className="fab fa-whatsapp" /></div>
                <div>
                    <h1 style={{ fontSize: '1.7rem', color: 'var(--text-primary)', margin: 0 }}>
                        {isArabic ? 'واتساب' : 'WhatsApp'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                        {isArabic ? 'إدارة رسائل ومحادثات الواتساب' : 'Manage WhatsApp messages and chats'}
                    </p>
                </div>
            </div>

            <div style={s.mainTabs}>
                <button style={s.mainTab(mainTab === 'chats')} onClick={() => setMainTab('chats')}>
                    <i className="fas fa-comments" style={{ marginInlineEnd: '6px' }} />
                    {isArabic ? 'صندوق الرسائل' : 'Chat Inbox'}
                </button>
            </div>

            <AnimatePresence mode="wait">
                <motion.div key="chats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {chatsLoading && chats.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#25D366' }} /></div>
                    ) : chats.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                            <div style={{ fontSize: '48px', color: '#25D366', marginBottom: '16px' }}><i className="fab fa-whatsapp" /></div>
                            <h3>{isArabic ? 'لا توجد محادثات واتساب بعد' : 'No WhatsApp chats yet'}</h3>
                            <p>{isArabic ? 'بمجرد أن يراسلك شخص عبر واتساب سيظهر هنا.' : 'Whenever someone messages you on WhatsApp, they will appear here.'}</p>
                        </div>
                    ) : (
                        <div style={s.chatLayout}>
                            {/* Sidebar */}
                            <div style={s.sidebar}>
                                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)', background: '#f0f2f5' }}>
                                    {isArabic ? 'المحادثات' : 'Chats'} ({chats.length})
                                </div>
                                {chats.map(chat => (
                                    <div key={chat.id} style={s.userItem(activeChatUser === chat.id)} onClick={() => setActiveChatUser(chat.id)}>
                                        <div style={{ fontWeight: 'bold', color: '#111b21', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                                                {(chat.name || 'U').charAt(0).toUpperCase()}
                                            </span>
                                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.name}</span>
                                                <span style={{ fontSize: '0.8rem', color: '#667781', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {chat.lastMessage}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Chat Area */}
                            <div style={s.messagesArea}>
                                {activeChatUser ? (
                                    <>
                                        <div style={{ padding: '12px 18px', background: '#f0f2f5', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', color: '#111b21', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                                                {activeChatUser.charAt(0).toUpperCase()}
                                            </span>
                                            {activeChatUser}
                                        </div>
                                        <div style={s.messagesBody}>
                                            {messages.length === 0 && (
                                                <div style={{ textAlign: 'center', background: '#fff9c4', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', color: '#544c1', margin: 'auto' }}>
                                                    {isArabic ? 'هذه بداية رسائلك مع هذا الرقم.' : 'This is the beginning of the chat.'}
                                                </div>
                                            )}
                                            {messages.map((msg, idx) => (
                                                <div key={idx} style={s.bubble(msg.sender)}>
                                                    <div style={{ color: msg.sender === 'user' ? '#12411e' : '#555', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '2px' }}>
                                                        {msg.sender === 'user' ? (isArabic ? 'العميل' : 'Customer') : 'VOXIO Bot'}
                                                    </div>
                                                    {msg.text}
                                                    <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '4px', textAlign: 'right' }}>
                                                        {formatTime(msg.createdAt)}
                                                    </div>
                                                </div>
                                            ))}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f0f2f5', color: '#667781', fontSize: '1.1rem' }}>
                                        {isArabic ? 'اختر محادثة لعرض الرسائل' : 'Select a chat to view messages'}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default WhatsappTab;
