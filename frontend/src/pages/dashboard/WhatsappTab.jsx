import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { secureStorage } from '../../utils/secureStorage';
import { motion, AnimatePresence } from 'framer-motion';  

import './DashboardShared.css';
import PageLoader from '../../components/ui/PageLoader';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const WhatsappTab = () => {
    const { language } = useLanguage();
    const isArabic = language === 'ar';
    const token = secureStorage.getItem('token');

    const [subTab, setSubTab] = useState('requests'); // 'requests' | 'inbox' | 'settings'
    const [settings, setSettings] = useState({
        website: '',
        about: '',
        products: '',
        facebook: '',
        instagram: '',
        contactPhone: ''
    });
    
    const [chats, setChats] = useState([]);
    const [activeChatUser, setActiveChatUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [requests, setRequests] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatsLoading, setChatsLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [aiEnabled, setAiEnabled] = useState(true);
    const [aiToggleLoading, setAiToggleLoading] = useState(false);
    const [aiStatusLoaded, setAiStatusLoaded] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [replyError, setReplyError] = useState('');
    const [newChatNumber, setNewChatNumber] = useState('');
    const [newChatMessage, setNewChatMessage] = useState('');
    const [sendingNewChat, setSendingNewChat] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [newChatError, setNewChatError] = useState('');
    const [integrationInfo, setIntegrationInfo] = useState(null);
    const [integrationLoading, setIntegrationLoading] = useState(true);
    const messagesEndRef = useRef(null);

    const fetchAiStatus = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/company/ai-status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (typeof res.data.aiEnabled === 'boolean') {
                setAiEnabled(res.data.aiEnabled);
                setAiStatusLoaded(true);
                return;
            }
        } catch (e) {
            // fallback to company endpoint
        }
        try {
            const res = await axios.get(`${BACKEND_URL}/company`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (typeof res.data.aiEnabled === 'boolean') setAiEnabled(res.data.aiEnabled);
            else setAiEnabled(true);
            setAiStatusLoaded(true);
        } catch (err) {
            setAiStatusLoaded(true);
        }
    };

    const handleToggleAi = async () => {
        const next = !aiEnabled;
        setAiToggleLoading(true);
        try {
            await axios.patch(`${BACKEND_URL}/company/ai-toggle`, { aiEnabled: next }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAiEnabled(next);
        } catch (e) {
            try {
                await axios.put(`${BACKEND_URL}/company/ai-toggle`, { aiEnabled: next }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAiEnabled(next);
            } catch (err2) {
                alert(isArabic ? 'فشل تغيير حالة الذكاء الاصطناعي' : 'Failed to toggle AI');
            }
        } finally {
            setAiToggleLoading(false);
        }
    };

    const fetchIntegrationInfo = async () => {
        setIntegrationLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/integration-manager`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const wa = (res.data || []).find(i => i.platform === 'whatsapp');
            if (wa) {
                setIntegrationInfo({
                    found: true,
                    isActive: wa.isActive,
                    hasCredentials: wa.hasCredentials,
                    hasPhoneId: !!wa.credentials?.phoneNumberId,
                    phoneNumberId: wa.credentials?.phoneNumberId || '',
                    hasToken: !!wa.credentials?.accessToken,
                });
            } else {
                setIntegrationInfo({ found: false });
            }
        } catch (e) {
            try {
                const res2 = await axios.get(`${BACKEND_URL}/integration-manager/whatsapp/settings`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const creds = res2.data.credentials || {};
                setIntegrationInfo({
                    found: !!creds.phoneNumberId || !!creds.accessToken,
                    isActive: true,
                    hasCredentials: !!creds.accessToken,
                    hasPhoneId: !!creds.phoneNumberId,
                    phoneNumberId: creds.phoneNumberId || '',
                    hasToken: !!creds.accessToken,
                });
            } catch (_) {
                setIntegrationInfo({ found: false });
            }
        } finally {
            setIntegrationLoading(false);
        }
    };

    useEffect(() => { 
        fetchSettings();
        fetchChats();
        fetchRequests();
        fetchAiStatus();
        fetchIntegrationInfo();
        const chatsInterval = setInterval(fetchChats, 15000);
        const reqInterval = setInterval(fetchRequests, 15000);
        return () => {
            clearInterval(chatsInterval);
            clearInterval(reqInterval);
        };
    }, []);

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

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/integration-manager/whatsapp/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.settings) {
                setSettings(prev => ({ ...prev, ...res.data.settings }));
            }
        } catch (e) {
            console.error("Error fetching settings:", e);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/company/requests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter out WhatsApp-only requests
            const waRequests = res.data.filter(r => 
                r.source === 'whatsapp' || 
                (r.message && (r.message.includes('واتساب') || r.message.includes('whatsapp')))
            );
            const reversed = [...waRequests].reverse();
            setRequests(reversed);
            const unique = [...new Set(reversed.map(r => r.product || 'عام'))];
            setCategories(unique);
            if (unique.length > 0) setActiveCategory(unique[0]);
        } catch (e) {
            console.error(e);
        }
    };

    const deleteRequest = async (originalIndex) => {
        if (!confirm(isArabic ? 'متأكد من حذف هذا الطلب؟' : 'Delete this request?')) return;
        try {
            const actualDbIndex = requests.length - 1 - originalIndex;
            await axios.delete(`${BACKEND_URL}/company/requests/${actualDbIndex}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRequests();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveSettings = async () => {
        setSaveLoading(true);
        try {
            await axios.put(`${BACKEND_URL}/integration-manager/whatsapp/settings`, settings, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(isArabic ? 'تم حفظ الإعدادات بنجاح!' : 'Settings saved successfully!');
        } catch (e) {
            alert(isArabic ? 'فشل حفظ الإعدادات.' : 'Failed to save settings.');
        } finally {
            setSaveLoading(false);
        }
    };

    const fetchChats = async () => {
        setChatsLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/support-chat/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const waChats = res.data.filter(c => c.platform === 'whatsapp');
            setChats(waChats);
            if (waChats.length > 0 && !activeChatUser) setActiveChatUser(waChats[0].id);
        } catch (e) {
            console.error(e);
        } finally {
            setChatsLoading(false);
            setLoading(false);
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

    const handleSendReply = async () => {
        if (!replyText.trim() || !activeChatUser || sendingReply) return;
        const textToSend = replyText.trim();
        setSendingReply(true);
        setReplyError('');
        try {
            const res = await axios.post(`${BACKEND_URL}/handoff/reply`, {
                userId: activeChatUser,
                platform: 'whatsapp',
                message: textToSend
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Success — check if Meta actually delivered or returned warning
            if (res.data?.warning) setReplyError(res.data.warning);
            setReplyText('');
            setMessages(prev => [...prev, { text: textToSend, sender: 'agent', createdAt: new Date().toISOString(), platform: 'whatsapp', status: 'delivered' }]);
            setTimeout(() => {
                fetchMessages(activeChatUser);
                fetchChats();
            }, 500);
        } catch (e) {
            const raw = e.response?.data;
            const msg = raw?.error || raw?.details || raw?.message || e.message || 'Unknown error';
            const details = raw?.metaError || raw?.details || '';
            const full = details ? `${msg} — ${typeof details === 'string' ? details.substring(0,300) : JSON.stringify(details).substring(0,300)}` : msg;
            setReplyError(full);
            console.error('[WhatsApp Send Error]', raw || e);
        } finally {
            setSendingReply(false);
        }
    };

    const handleSendNewChat = async () => {
        const cleanNumber = newChatNumber.replace(/[^0-9]/g, '');
        if (!cleanNumber || cleanNumber.length < 8) {
            setNewChatError(isArabic ? 'أدخل رقم صحيح مع رمز الدولة (مثال: 201012345678)' : 'Enter a valid number with country code (e.g. 201012345678)');
            return;
        }
        if (!newChatMessage.trim()) {
            setNewChatError(isArabic ? 'اكتب نص الرسالة' : 'Enter message text');
            return;
        }
        setSendingNewChat(true);
        setNewChatError('');
        try {
            const res = await axios.post(`${BACKEND_URL}/handoff/reply`, {
                userId: cleanNumber,
                platform: 'whatsapp',
                message: newChatMessage.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.warning) setNewChatError(res.data.warning);
            setNewChatMessage('');
            setNewChatNumber('');
            setShowNewChat(false);
            setActiveChatUser(cleanNumber);
            fetchChats();
            setTimeout(() => fetchMessages(cleanNumber), 800);
        } catch (e) {
            const raw = e.response?.data;
            const msg = raw?.error || raw?.details || e.message || 'Unknown error';
            const details = raw?.metaError || raw?.details || '';
            const full = details ? `${msg} — ${typeof details === 'string' ? details.substring(0,300) : JSON.stringify(details).substring(0,300)}` : msg;
            setNewChatError(full);
            console.error('[WhatsApp New Chat Error]', raw || e);
        } finally {
            setSendingNewChat(false);
        }
    };

    const formatTime = (val) => {
        if (!val) return '';
        const d = val?._seconds ? new Date(val._seconds * 1000) : new Date(val);
        return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getSenderLabel = (sender) => {
        if (sender === 'user') return isArabic ? 'العميل' : 'Customer';
        if (sender === 'ai') return 'AI';
        if (sender === 'agent') return isArabic ? 'أنت' : 'You';
        return sender === 'user' ? (isArabic ? 'العميل' : 'Customer') : 'VOXIO';
    };

    // ─── PREMIUM STYLES ────────────────────────────────────────────────────────
    return (
        <div className="whatsapp-tab-page animate-fade-in" style={{ direction: isArabic ? 'rtl' : 'ltr' }}>
            <div className="dash-page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #25D366, #128C7E)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: '0 8px 16px rgba(37, 211, 102, 0.2)' }}>
                        <i className="fab fa-whatsapp" />
                    </div>
                    <div>
                        <h1 className="dash-page-title">{isArabic ? 'واتساب' : 'WhatsApp'}</h1>
                        <p className="dash-page-subtitle">{isArabic ? 'إدارة رسائل ومحادثات الواتساب' : 'Manage WhatsApp messages and chats'}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', background: 'var(--dash-card)', padding: '6px', borderRadius: '14px', border: '1px solid var(--dash-border)' }}>
                    <button 
                        className={`dash-btn ${subTab === 'requests' ? 'dash-btn-primary' : 'dash-btn-outline'}`} 
                        onClick={() => setSubTab('requests')}
                        style={{ padding: '8px 16px', fontSize: '0.9rem', height: 'auto' }}
                    >
                        <i className="fas fa-inbox"></i>
                        {isArabic ? 'الطلبات' : 'Requests'}
                    </button>
                    <button 
                        className={`dash-btn ${subTab === 'inbox' ? 'dash-btn-primary' : 'dash-btn-outline'}`} 
                        onClick={() => setSubTab('inbox')}
                        style={{ padding: '8px 16px', fontSize: '0.9rem', height: 'auto' }}
                    >
                        <i className="fas fa-comments"></i>
                        {isArabic ? 'الرسائل' : 'Inbox'}
                    </button>
                    <button 
                        className={`dash-btn ${subTab === 'settings' ? 'dash-btn-primary' : 'dash-btn-outline'}`} 
                        onClick={() => setSubTab('settings')}
                        style={{ padding: '8px 16px', fontSize: '0.9rem', height: 'auto' }}
                    >
                        <i className="fas fa-id-card"></i>
                        {isArabic ? 'البروفايل' : 'Profile'}
                    </button>
                </div>
            </div>

            {/* ── Global AI Toggle — Prominent ── */}
            <div className="dash-card" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
                padding: '16px 18px', marginBottom: '18px', borderRadius: '16px',
                background: aiEnabled ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #ffffff 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fff7ed 50%, #ffffff 100%)',
                border: `1px solid ${aiEnabled ? 'rgba(37,211,102,0.18)' : 'rgba(239,68,68,0.15)'}`,
                boxShadow: aiEnabled ? '0 6px 18px rgba(37,211,102,0.08)' : '0 6px 18px rgba(239,68,68,0.07)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 260px' }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: aiEnabled ? 'linear-gradient(135deg,#25D366,#128C7E)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                        boxShadow: aiEnabled ? '0 6px 14px rgba(37,211,102,0.25)' : '0 6px 14px rgba(239,68,68,0.2)',
                        flexShrink: 0
                    }}>
                        <i className={aiEnabled ? 'fas fa-robot' : 'fas fa-robot'} style={{ opacity: aiEnabled ? 1 : 0.95 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 900, fontSize: '0.95rem', color: aiEnabled ? '#065f46' : '#7f1d1d' }}>
                                {isArabic ? 'الرد التلقائي بالذكاء الاصطناعي' : 'AI Auto-Responder'}
                            </span>
                            <span style={{
                                fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: '20px',
                                background: aiEnabled ? '#dcfce7' : '#fee2e2', color: aiEnabled ? '#166534' : '#991b1b',
                                border: `1px solid ${aiEnabled ? '#bbf7d0' : '#fecaca'}`
                            }}>
                                {aiEnabled ? (isArabic ? '● نشط' : '● ACTIVE') : (isArabic ? '● متوقف' : '● PAUSED')}
                            </span>
                            {!aiStatusLoaded && <span style={{ fontSize: '0.7rem', color: 'var(--dash-text-sec)' }}><i className="fas fa-spinner fa-spin" /></span>}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--dash-text-sec)', marginTop: '4px', lineHeight: 1.5, fontWeight: 600 }}>
                            {aiEnabled
                                ? (isArabic ? 'الذكاء الاصطناعي يرد تلقائياً على كل رسائل واتساب الواردة.' : 'AI is replying automatically to all incoming WhatsApp messages.')
                                : (isArabic ? 'الرد التلقائي متوقف — جميع الرسائل تتطلب تدخلاً بشرياً.' : 'Auto-reply paused — all messages need human attention.')}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <Link to="/dashboard/whatsapp-bulk" className="dash-btn" style={{
                        background: 'linear-gradient(135deg,#111827,#1f2937)', color: 'white', border: 'none',
                        padding: '10px 16px', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem', height: 'auto',
                        display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none'
                    }}>
                        <i className="fas fa-paper-plane" /> {isArabic ? 'الإرسال الجماعي' : 'Bulk Sender'}
                    </Link>

                    <button
                        onClick={handleToggleAi}
                        disabled={aiToggleLoading || !aiStatusLoaded}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            background: aiEnabled ? 'linear-gradient(135deg,#25D366,#128C7E)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                            color: 'white', border: 'none', borderRadius: '12px', padding: '10px 16px',
                            fontWeight: 900, fontSize: '0.88rem', cursor: aiToggleLoading ? 'wait' : 'pointer',
                            boxShadow: aiEnabled ? '0 8px 16px rgba(37,211,102,0.22)' : '0 8px 16px rgba(239,68,68,0.2)',
                            opacity: aiToggleLoading ? 0.7 : 1, minWidth: '140px', justifyContent: 'center'
                        }}
                    >
                        {aiToggleLoading ? <i className="fas fa-spinner fa-spin" /> : <i className={aiEnabled ? 'fas fa-pause' : 'fas fa-play'} />}
                        {aiEnabled ? (isArabic ? 'إيقاف الـ AI' : 'Stop AI') : (isArabic ? 'تفعيل الـ AI' : 'Start AI')}
                    </button>

                    {/* Decorative toggle switch visual */}
                    <div
                        onClick={!aiToggleLoading && aiStatusLoaded ? handleToggleAi : undefined}
                        style={{
                            width: '54px', height: '30px', borderRadius: '20px', padding: '3px',
                            background: aiEnabled ? '#25D366' : '#e5e7eb',
                            border: `1px solid ${aiEnabled ? 'rgba(37,211,102,0.3)' : '#d1d5db'}`,
                            display: 'flex', alignItems: 'center', justifyContent: aiEnabled ? 'flex-end' : 'flex-start',
                            cursor: aiToggleLoading ? 'wait' : 'pointer', transition: 'all 0.25s ease', flexShrink: 0
                        }}
                        title={aiEnabled ? (isArabic ? 'إيقاف' : 'Turn off') : (isArabic ? 'تفعيل' : 'Turn on')}
                    >
                        <div style={{
                            width: '22px', height: '22px', borderRadius: '50%', background: 'white',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.6rem', color: aiEnabled ? '#25D366' : '#9ca3af', transition: 'all 0.25s ease'
                        }}>
                            <i className={aiEnabled ? 'fas fa-check' : 'fas fa-times'} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Integration Status / Error Banner ── */}
            {!integrationLoading && integrationInfo && !integrationInfo.found && (
                <div className="dash-card" style={{
                    background: 'linear-gradient(135deg,#fef2f2,#fff7ed)', border: '1px solid #fecaca',
                    padding: '14px 16px', borderRadius: '14px', marginBottom: '16px',
                    display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'
                }}>
                    <span style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#ef4444', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><i className="fas fa-unlink" /></span>
                    <div style={{ flex:1 }}>
                        <div style={{ fontWeight:900, color:'#991b1b', fontSize:'0.9rem' }}>{isArabic ? 'واتساب غير مربوط' : 'WhatsApp not connected'}</div>
                        <div style={{ fontSize:'0.8rem', color:'#7f1d1d', marginTop:'2px' }}>{isArabic ? 'لن تصل الرسائل حتى تربط رقم واتساب الرسمي. اذهب للتكاملات وأدخل Phone Number ID و Access Token.' : 'Messages will not deliver until you connect your official WhatsApp number in Integrations.'}</div>
                    </div>
                    <Link to="/dashboard/integrations" className="dash-btn" style={{ background:'#dc2626', color:'white', border:'none', padding:'8px 14px', borderRadius:'10px', fontWeight:800, fontSize:'0.85rem', textDecoration:'none' }}>
                        {isArabic ? 'ربط واتساب' : 'Connect WhatsApp'} <i className="fas fa-external-link-alt" style={{ fontSize:'0.7rem' }} />
                    </Link>
                </div>
            )}
            {!integrationLoading && integrationInfo?.found && !integrationInfo.hasCredentials && (
                <div className="dash-card" style={{
                    background:'linear-gradient(135deg,#fffbeb,#fef3c7)', border:'1px solid #fde68a',
                    padding:'14px 16px', borderRadius:'14px', marginBottom:'16px',
                    display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap'
                }}>
                    <span style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#f59e0b', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}><i className="fas fa-exclamation-triangle" /></span>
                    <div style={{ flex:1 }}>
                        <div style={{ fontWeight:900, color:'#92400e', fontSize:'0.9rem' }}>{isArabic ? 'إعدادات واتساب ناقصة' : 'WhatsApp credentials incomplete'}</div>
                        <div style={{ fontSize:'0.8rem', color:'#78350f' }}>
                            {isArabic ? `PhoneNumberId: ${integrationInfo.phoneNumberId ? '✓ موجود' : '✗ مفقود'} — AccessToken: ${integrationInfo.hasToken ? '✓ موجود' : '✗ مفقود'}` : `PhoneNumberId: ${integrationInfo.hasPhoneId?'✓':'✗'} — Token: ${integrationInfo.hasToken?'✓':'✗'}`}
                        </div>
                    </div>
                    <Link to="/dashboard/integrations" className="dash-btn dash-btn-outline" style={{ padding:'8px 14px', borderRadius:'10px', fontSize:'0.85rem' }}>{isArabic?'إصلاح':'Fix'}</Link>
                </div>
            )}
            {!integrationLoading && integrationInfo?.found && integrationInfo.hasCredentials && !integrationInfo.isActive && (
                <div className="dash-card" style={{ background:'#fef2f2', border:'1px solid #fecaca', padding:'12px 16px', borderRadius:'14px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'10px' }}>
                    <i className="fas fa-pause-circle" style={{ color:'#ef4444' }} />
                    <span style={{ fontWeight:700, color:'#991b1b', fontSize:'0.85rem' }}>{isArabic ? 'التكامل متوقف — فعّله من التكاملات' : 'Integration paused — enable it in Integrations'}</span>
                </div>
            )}

            <AnimatePresence mode="wait">
                {subTab === 'requests' ? (
                    <motion.div key="requests" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {loading ? (
                            <PageLoader text={isArabic ? 'جاري تحميل الطلبات...' : 'Loading requests...'} />
                        ) : requests.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                                <div style={{ fontSize: '48px', color: '#25D366', marginBottom: '16px' }}><i className="fab fa-whatsapp" /></div>
                                <h3>{isArabic ? 'لا توجد طلبات بعد' : 'No requests yet'}</h3>
                                <p>{isArabic ? 'سيظهر هنا كل طلب شراء يتم فهمه تلقائياً بواسطة المساعد الذكي عبر واتساب.' : 'Requests understood by the AI Assistant on WhatsApp will populate here.'}</p>
                            </div>
                        ) : (
                            <>
                                {/* Category Tabs */}
                                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '24px' }}>
                                    {categories.map(cat => (
                                        <button 
                                            key={cat} 
                                            className={`dash-btn ${activeCategory === cat ? 'dash-btn-primary' : 'dash-btn-outline'}`} 
                                            onClick={() => setActiveCategory(cat)}
                                            style={{ borderRadius: '24px', padding: '6px 20px', fontSize: '0.85rem', height: 'auto', background: activeCategory === cat ? '#25D366' : 'transparent', borderColor: activeCategory === cat ? '#25D366' : 'var(--dash-border)', color: activeCategory === cat ? '#fff' : 'var(--dash-text)' }}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                {/* Cards Grid */}
                                <div className="dash-grid">
                                    <AnimatePresence>
                                        {requests.filter(r => (r.product || 'عام') === activeCategory).map((req, idx) => {
                                            const cleanPhone = (req.customerName || '').match(/\((.*?)\)/)?.[1] || '';
                                            const cleanName = (req.customerName || '').replace(/\(.*?\)/, '').trim();

                                            return (
                                                <motion.div key={idx} className="dash-card animate-slide-in" layout
                                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                                        <div>
                                                            <div style={{ fontWeight: '700', color: 'var(--dash-text)', fontSize: '1rem' }}>
                                                                <i className="fas fa-user-circle" style={{ marginInlineEnd: '8px', color: '#25D366' }} />
                                                                {cleanName}
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--dash-text-sec)', marginTop: '4px' }}>
                                                                {req.product && <span style={{ background: 'rgba(37, 211, 102, 0.1)', color: '#25D366', borderRadius: '6px', padding: '2px 8px', marginInlineEnd: '8px', fontSize: '0.7rem', fontWeight: 'bold' }}>{req.product}</span>}
                                                                {req.date ? (new Date(req.date)).toLocaleString() : ''}
                                                            </div>
                                                        </div>
                                                        <button onClick={() => deleteRequest(idx)}
                                                            style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', opacity: 0.6 }}>
                                                            <i className="fas fa-trash" />
                                                        </button>
                                                    </div>
                                                    <div style={{ background: 'rgba(var(--color-text-rgb), 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--dash-border)', fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--dash-text)' }}>
                                                        {req.message}
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                                        {cleanPhone && (
                                                            <a 
                                                                href={`https://wa.me/${cleanPhone.replace(/[^0-9]/g, '')}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="dash-btn"
                                                                style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', background: '#25D366', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: 'auto', borderRadius: '10px' }}
                                                            >
                                                                <i className="fab fa-whatsapp" />
                                                                {isArabic ? 'مراسلة واتساب' : 'Chat WhatsApp'}
                                                            </a>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </>
                        )}
                    </motion.div>
                ) : subTab === 'inbox' ? (
                    <motion.div key="inbox" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                        {chats.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                                <div style={{ fontSize: '48px', color: '#25D366', marginBottom: '16px' }}><i className="fab fa-whatsapp" /></div>
                                <h3>{isArabic ? 'لا توجد محادثات واتساب بعد' : 'No WhatsApp chats yet'}</h3>
                                <p>{isArabic ? 'بمجرد أن يراسلك شخص عبر واتساب سيظهر هنا.' : 'Whenever someone messages you on WhatsApp, they will appear here.'}</p>
                            </div>
                        ) : (
                        <div style={{ display: 'flex', height: '600px', borderRadius: '24px', overflow: 'hidden', background: 'var(--dash-card)', border: '1px solid var(--dash-border)' }}>
                                {/* Sidebar */}
                                <div style={{ width: '280px', borderInlineEnd: '1px solid var(--dash-border)', overflowY: 'auto', background: 'rgba(var(--color-text-rgb), 0.02)', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--dash-border)', fontSize: '0.8rem', fontWeight: '800', color: 'var(--dash-text-sec)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {isArabic ? 'المحادثات' : 'Chats'} ({chats.length})
                                    </div>
                                    {/* ── Manual New Chat Composer ── */}
                                    <div style={{ padding: '12px', borderBottom: '1px solid var(--dash-border)', background: 'var(--dash-card)' }}>
                                        {!showNewChat ? (
                                            <button
                                                onClick={() => setShowNewChat(true)}
                                                style={{
                                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                    background: 'linear-gradient(135deg,#25D366,#128C7E)', color: 'white', border: 'none',
                                                    padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                                                    boxShadow: '0 4px 12px rgba(37,211,102,0.2)'
                                                }}
                                            >
                                                <i className="fas fa-plus" /> {isArabic ? 'رسالة جديدة' : 'New Message'}
                                            </button>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <input
                                                    className="dash-input"
                                                    placeholder={isArabic ? 'رقم واتساب مع رمز الدولة (2010...)' : 'WhatsApp number with country code (2010...)'}
                                                    value={newChatNumber}
                                                    onChange={e => setNewChatNumber(e.target.value)}
                                                    style={{ fontSize: '0.85rem', padding: '10px 12px' }}
                                                />
                                                <textarea
                                                    className="dash-textarea"
                                                    placeholder={isArabic ? 'نص الرسالة...' : 'Message...'}
                                                    value={newChatMessage}
                                                    onChange={e => setNewChatMessage(e.target.value)}
                                                    rows={2}
                                                    style={{ fontSize: '0.85rem', minHeight: '70px' }}
                                                />
                                                {newChatError && (
                                                    <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b', padding:'8px 10px', borderRadius:'10px', fontSize:'0.75rem', lineHeight:1.5, wordBreak:'break-word' }}>
                                                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px' }}>
                                                            <span><i className="fas fa-exclamation-circle" /> {newChatError}</span>
                                                            <button onClick={()=>setNewChatError('')} style={{ background:'none', border:'none', color:'#991b1b', cursor:'pointer', padding:'2px' }}><i className="fas fa-times" /></button>
                                                        </div>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={handleSendNewChat}
                                                        disabled={sendingNewChat}
                                                        className="dash-btn"
                                                        style={{ flex: 1, background: '#25D366', color: 'white', border: 'none', padding: '8px', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', opacity: sendingNewChat ? 0.7 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}
                                                    >
                                                        {sendingNewChat ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}
                                                        {isArabic ? 'إرسال' : 'Send'}
                                                    </button>
                                                    <button
                                                        onClick={() => { setShowNewChat(false); setNewChatNumber(''); setNewChatMessage(''); setNewChatError(''); }}
                                                        className="dash-btn dash-btn-outline"
                                                        style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}
                                                    >
                                                        {isArabic ? 'إلغاء' : 'Cancel'}
                                                    </button>
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--dash-text-sec)', textAlign: 'center' }}>
                                                    <i className="fas fa-info-circle" /> {isArabic ? 'سيتم الإرسال عبر رقم واتساب الرسمي' : 'Sent via your official WhatsApp number'}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {chats.map(chat => (
                                        <div 
                                            key={chat.id} 
                                            onClick={() => setActiveChatUser(chat.id)}
                                            style={{
                                                padding: '16px 20px', cursor: 'pointer', borderBottom: '1px solid var(--dash-border)',
                                                background: activeChatUser === chat.id ? 'rgba(37, 211, 102, 0.08)' : 'transparent',
                                                borderInlineStart: activeChatUser === chat.id ? '4px solid #25D366' : '4px solid transparent',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <div style={{ fontWeight: '700', color: 'var(--dash-text)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0, fontWeight: 'bold' }}>
                                                    {(chat.name || 'U').charAt(0).toUpperCase()}
                                                </span>
                                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.name || chat.id}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--dash-text-sec)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                                                        {chat.lastMessage || (isArabic ? 'بدء محادثة جديدة' : 'New chat started')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Chat Area */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--dash-bg)', minWidth: 0 }}>
                                    {activeChatUser ? (
                                        <>
                                            <div style={{ padding: '16px 20px', background: 'var(--dash-card)', borderBottom: '1px solid var(--dash-border)', fontWeight: '700', color: 'var(--dash-text)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold' }}>
                                                    {activeChatUser.charAt(0).toUpperCase()}
                                                </span>
                                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeChatUser}</span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'rgba(37,211,102,0.1)', color: '#128C7E', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(37,211,102,0.15)' }}>
                                                    <i className="fab fa-whatsapp" /> whatsapp
                                                </span>
                                            </div>
                                            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'cover', backgroundBlendMode: 'overlay', backgroundOpacity: 0.05 }}>
                                                {messages.length === 0 && (
                                                    <div style={{ textAlign: 'center', background: 'rgba(37, 211, 102, 0.1)', border: '1px solid rgba(37, 211, 102, 0.15)', padding: '8px 16px', borderRadius: '12px', fontSize: '0.85rem', color: '#128C7E', margin: 'auto', fontWeight: 'bold' }}>
                                                        {isArabic ? 'هذه بداية رسائلك مع هذا الرقم.' : 'This is the beginning of the chat.'}
                                                    </div>
                                                )}
                                                {messages.map((msg, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        style={{
                                                            maxWidth: '75%', padding: '12px 18px', 
                                                            borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                            background: msg.sender === 'user' ? '#128C7E' : 'var(--dash-card)',
                                                            color: msg.sender === 'user' ? 'white' : 'var(--dash-text)',
                                                            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                                            fontSize: '0.9rem', lineHeight: '1.5', wordBreak: 'break-word',
                                                            border: msg.sender !== 'user' ? '1px solid var(--dash-border)' : 'none',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                                        }}
                                                    >
                                                        <div style={{ color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--dash-text-sec)', fontSize: '0.7rem', fontWeight: '800', marginBottom: '4px' }}>
                                                            {getSenderLabel(msg.sender)}
                                                        </div>
                                                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                                                        <div style={{ fontSize: '0.7rem', color: msg.sender === 'user' ? 'rgba(255,255,255,0.6)' : 'var(--dash-text-sec)', marginTop: '6px', display:'flex', alignItems:'center', justifyContent: msg.sender==='user'?'flex-end':'space-between', gap:'8px' }}>
                                                            <span>{formatTime(msg.createdAt)}</span>
                                                            {msg.status === 'failed' && (
                                                                <span style={{ color:'#ef4444', fontWeight:800, display:'flex', alignItems:'center', gap:'4px', fontSize:'0.65rem', background:'rgba(239,68,68,0.1)', padding:'2px 6px', borderRadius:'20px', border:'1px solid rgba(239,68,68,0.15)' }}>
                                                                    <i className="fas fa-exclamation-triangle" /> {isArabic?'فشل الإرسال':'failed'}
                                                                </span>
                                                            )}
                                                            {msg.status === 'delivered' && <i className="fas fa-check-double" style={{ color:'#25D366', fontSize:'0.65rem' }} />}
                                                        </div>
                                                    </div>
                                                ))}
                                                <div ref={messagesEndRef} />
                                            </div>
                                            {/* ── Reply Error Banner ── */}
                                            {replyError && (
                                                <div style={{
                                                    margin: '0 16px 0 16px', background:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b',
                                                    padding:'10px 12px', borderRadius:'10px', fontSize:'0.8rem', lineHeight:1.6, wordBreak:'break-word',
                                                    display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'10px', flexShrink:0
                                                }}>
                                                    <span><i className="fas fa-exclamation-triangle" style={{ marginInlineEnd:'6px' }} />{replyError}</span>
                                                    <button onClick={()=>setReplyError('')} style={{ background:'#991b1b', color:'white', border:'none', borderRadius:'6px', padding:'2px 8px', fontSize:'0.7rem', cursor:'pointer', flexShrink:0 }}>{isArabic?'إخفاء':'Dismiss'}</button>
                                                </div>
                                            )}
                                            {/* ── Manual Reply Composer ── */}
                                            <div style={{
                                                padding: '12px 16px', background: 'var(--dash-card)', borderTop: '1px solid var(--dash-border)',
                                                display: 'flex', gap: '10px', alignItems: 'flex-end', flexShrink: 0
                                            }}>
                                                <textarea
                                                    value={replyText}
                                                    onChange={e => setReplyText(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleSendReply();
                                                        }
                                                    }}
                                                    placeholder={isArabic ? 'اكتب رسالتك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)' : 'Type your message... (Enter to send, Shift+Enter for new line)'}
                                                    rows={1}
                                                    style={{
                                                        flex: 1, minHeight: '44px', maxHeight: '110px', resize: 'none',
                                                        background: 'var(--dash-bg)', border: '1px solid var(--dash-border)',
                                                        borderRadius: '12px', padding: '12px 14px', fontSize: '0.9rem',
                                                        color: 'var(--dash-text)', outline: 'none', lineHeight: 1.5
                                                    }}
                                                />
                                                <button
                                                    onClick={handleSendReply}
                                                    disabled={!replyText.trim() || sendingReply}
                                                    style={{
                                                        background: (!replyText.trim() || sendingReply) ? '#9ca3af' : 'linear-gradient(135deg,#25D366,#128C7E)',
                                                        color: 'white', border: 'none', borderRadius: '12px',
                                                        padding: '12px 18px', fontWeight: 800, fontSize: '0.9rem',
                                                        cursor: (!replyText.trim() || sendingReply) ? 'not-allowed' : 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
                                                        boxShadow: (!replyText.trim() || sendingReply) ? 'none' : '0 4px 12px rgba(37,211,102,0.25)',
                                                        opacity: (!replyText.trim() || sendingReply) ? 0.7 : 1, height: '44px'
                                                    }}
                                                >
                                                    {sendingReply ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}
                                                    {isArabic ? 'إرسال' : 'Send'}
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--dash-bg)', color: 'var(--dash-text-sec)', gap: '12px', padding: '24px', textAlign: 'center' }}>
                                            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--dash-card)', border: '1px solid var(--dash-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25D366', fontSize: '1.4rem' }}>
                                                <i className="fab fa-whatsapp" />
                                            </div>
                                            <div style={{ fontWeight: 800, color: 'var(--dash-text)', fontSize: '1rem' }}>{isArabic ? 'اختر محادثة لعرض الرسائل' : 'Select a chat to view messages'}</div>
                                            <div style={{ fontSize: '0.85rem', maxWidth: '280px', lineHeight: 1.5 }}>
                                                {isArabic ? 'أو ابدأ محادثة جديدة باستخدام زر "رسالة جديدة" في القائمة الجانبية.' : 'Or start a new conversation using "New Message" in the sidebar.'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key="settings" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                        <div className="dash-card animate-slide-in" style={{ maxWidth: '800px' }}>
                            <h3 style={{ margin: '0 0 8px', color: '#25D366', fontSize: '1.2rem', fontWeight: '800' }}>{isArabic ? 'بيانات الشركة للواتساب' : 'Company Data for WhatsApp'}</h3>
                            <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: 'var(--dash-text-sec)' }}>
                                {isArabic ? 'هذه المعلومات ستساعد الذكاء الاصطناعي على الرد بدقة أكبر على عملائك.' : 'This information helps the AI respond more accurately to your customers.'}
                            </p>

                            <div className="dash-input-group">
                                <label className="dash-label">{isArabic ? 'رابط الموقع الإلكتروني' : 'Website URL'}</label>
                                <input 
                                    className="dash-input" 
                                    placeholder="https://example.com" 
                                    value={settings.website}
                                    onChange={e => setSettings({...settings, website: e.target.value})}
                                />
                            </div>

                            <div className="dash-input-group">
                                <label className="dash-label">{isArabic ? 'عن الشركة (نبذة)' : 'About Company'}</label>
                                <textarea 
                                    className="dash-textarea" 
                                    placeholder={isArabic ? 'اكتب نبذة مختصرة عن نشاط شركتك...' : 'Briefly describe your company...'}
                                    value={settings.about}
                                    onChange={e => setSettings({...settings, about: e.target.value})}
                                    style={{ minHeight: '100px' }}
                                />
                            </div>

                            <div className="dash-input-group">
                                <label className="dash-label">{isArabic ? 'قائمة المنتجات والخدمات' : 'Products & Services'}</label>
                                <textarea 
                                    className="dash-textarea" 
                                    placeholder={isArabic ? 'مثال: منتج أ (100 جنيه)، خدمة ب (200 جنيه)...' : 'Example: Product A ($100), Service B ($200)...'}
                                    value={settings.products}
                                    onChange={e => setSettings({...settings, products: e.target.value})}
                                    style={{ minHeight: '120px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                                <div className="dash-input-group" style={{ flex: '1 1 300px' }}>
                                    <label className="dash-label">{isArabic ? 'رابط فيسبوك' : 'Facebook Link'}</label>
                                    <input 
                                        className="dash-input" 
                                        placeholder="https://facebook.com/..." 
                                        value={settings.facebook}
                                        onChange={e => setSettings({...settings, facebook: e.target.value})}
                                    />
                                </div>
                                <div className="dash-input-group" style={{ flex: '1 1 300px' }}>
                                    <label className="dash-label">{isArabic ? 'رابط إنستجرام' : 'Instagram Link'}</label>
                                    <input 
                                        className="dash-input" 
                                        placeholder="https://instagram.com/..." 
                                        value={settings.instagram}
                                        onChange={e => setSettings({...settings, instagram: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="dash-input-group">
                                <label className="dash-label">{isArabic ? 'رقم موبايل إضافي للتواصل' : 'Additional Contact Phone'}</label>
                                <input 
                                    className="dash-input" 
                                    placeholder="+201234567890" 
                                    value={settings.contactPhone}
                                    onChange={e => setSettings({...settings, contactPhone: e.target.value})}
                                />
                            </div>

                            <button 
                                className="dash-btn" 
                                onClick={handleSaveSettings} 
                                disabled={saveLoading}
                                style={{ background: '#25D366', color: 'white', marginTop: '10px', width: 'fit-content', padding: '12px 32px' }}
                            >
                                {saveLoading ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ الإعدادات' : 'Save Settings')}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WhatsappTab;
