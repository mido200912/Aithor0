import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { secureStorage } from '../../utils/secureStorage';
import { motion, AnimatePresence } from 'framer-motion';
import './Inbox.css';

const Inbox = () => {
    const { t } = useLanguage();
    const [conversations, setConversations] = useState([]);
    const [selectedConv, setSelectedConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [training, setTraining] = useState(false);

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://aithor1.vercel.app/api';
    const token = secureStorage.getItem('token');

    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${BACKEND_URL}/support-chat/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(res.data);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchChatHistory = async (userId) => {
        try {
            const res = await axios.get(`${BACKEND_URL}/support-chat/history/${encodeURIComponent(userId)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data);
        } catch (error) {
            console.error('Error fetching chat history:', error);
        }
    };

    const handleSelectConversation = (conv) => {
        setSelectedConv(conv);
        fetchChatHistory(conv.id);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedConv) return;

        try {
            setSending(true);
            const res = await axios.post(`${BACKEND_URL}/support-chat/send`, {
                userId: selectedConv.id,
                text: messageInput
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Add message to local state immediately
            setMessages(prev => [...prev, res.data]);
            setMessageInput('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert(t.dashboard.inboxPage.sendError);
        } finally {
            setSending(false);
        }
    };

    const handleTrainModel = async () => {
        if (!selectedConv) return;
        setTraining(true);
        try {
            const res = await axios.post(`${BACKEND_URL}/support-chat/train`, {
                userId: selectedConv.id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`✅ ${res.data.message}\n${t.dashboard.inboxPage.addedInst}: ${res.data.addedInstruction}`);
        } catch (error) {
            console.error('Error training model:', error);
            alert(t.dashboard.inboxPage.trainError);
        } finally {
            setTraining(false);
        }
    };

    const formatTime = (date) => {
        const messageDate = new Date(date);
        const now = new Date();
        const diffDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return messageDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return t.dashboard.inboxPage.yesterday;
        } else {
            return messageDate.toLocaleDateString('ar-EG');
        }
    };

    return (
        <div className="inbox-container animate-fade-in">
            {/* Conversations List */}
            <div className={`conversations-list ${selectedConv ? 'mobile-hidden' : ''}`}>
                <div className="inbox-header">
                    <h2>{t.dashboard.inboxPage.title}</h2>
                    <span className="badge">{conversations.length}</span>
                </div>
                <div className="search-box">
                    <i className="fas fa-search"></i>
                    <input type="text" placeholder={t.dashboard.inboxPage.search} />
                </div>
                <div className="conversations-scroll">
                    {loading ? (
                        <p style={{ textAlign: 'center', padding: '20px' }}>{t.dashboard.inboxPage.loading}</p>
                    ) : conversations.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                            {t.dashboard.inboxPage.noConversations}
                        </p>
                    ) : (
                        conversations.map((conv, index) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={conv.id}
                                className={`conversation-item ${selectedConv?.id === conv.id ? 'active' : ''}`}
                                onClick={() => handleSelectConversation(conv)}
                            >
                                <div className="conv-avatar">
                                    <span>{conv.name[0]}</span>
                                    <i className={`fab fa-${conv.platform === 'web' ? 'chrome' : conv.platform} platform-icon`}></i>
                                </div>
                                <div className="conv-content">
                                    <div className="conv-top">
                                        <h4>{conv.name}</h4>
                                        <span className="conv-time">{formatTime(conv.time)}</span>
                                    </div>
                                    <div className="conv-bottom">
                                        <p>{conv.lastMessage}</p>
                                        {conv.unread > 0 && <AnimatePresence><motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="unread-badge">{conv.unread}</motion.span></AnimatePresence>}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`chat-area ${!selectedConv ? 'mobile-hidden' : ''}`}>
                {selectedConv ? (
                    <>
                        <div className="chat-header">
                            <button className="back-btn mobile-only" onClick={() => setSelectedConv(null)}>
                                <i className="fas fa-arrow-right"></i>
                            </button>
                            <div className="header-info">
                                <h3>{selectedConv.name}</h3>
                                <span className="status-online">
                                    <i className="fab fa-{selectedConv.platform}"></i> {selectedConv.platform}
                                </span>
                            </div>
                            <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className="btn btn-primary premium-hover"
                                    onClick={handleTrainModel}
                                    disabled={training}
                                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', gap: '0.4rem', display: 'flex', alignItems: 'center', borderRadius: '20px' }}
                                    title={t.dashboard.inboxPage.trainTitle}
                                >
                                    <i className={training ? "fas fa-spinner fa-spin" : "fas fa-brain"}></i>
                                    <span className="mobile-hidden">{training ? t.dashboard.inboxPage.training : t.dashboard.inboxPage.trainBot}</span>
                                </button>
                                <button className="icon-btn"><i className="fas fa-ellipsis-v"></i></button>
                            </div>
                        </div>

                        <div className="messages-list">
                            {messages.map((msg) => (
                                <div key={msg._id} className={`message ${msg.sender === 'user' ? 'received' : 'sent'}`}>
                                    <p>{msg.text}</p>
                                    <span className="msg-time">{formatTime(msg.createdAt)}</span>
                                </div>
                            ))}
                        </div>

                        <form className="chat-input-area" onSubmit={handleSendMessage}>
                            <button type="button" className="icon-btn"><i className="fas fa-paperclip"></i></button>
                            <input
                                type="text"
                                placeholder={t.dashboard.inboxPage.typeMessage}
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                disabled={sending}
                            />
                            <button type="submit" className="send-btn" disabled={sending}>
                                <i className={sending ? "fas fa-spinner fa-spin" : "fas fa-paper-plane"}></i>
                            </button>
                        </form>
                    </>
                ) : (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="empty-state">
                        <i className="fas fa-comments"></i>
                        <h3>{t.dashboard.inboxPage.selectConv}</h3>
                        <p>{t.dashboard.inboxPage.selectConvDesc}</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default Inbox;
