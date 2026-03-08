import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import './ModelTest.css';

const ModelTest = () => {
    const { token } = useAuth();
    const { t } = useLanguage();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initial greeting based on company info
    useEffect(() => {
        const fetchCompanyAndGreet = async () => {
            try {
                // We don't necessarily need to fetch company here if the backend handles context,
                // but a welcome message is nice.
                setMessages([
                    {
                        id: 1,
                        role: 'assistant',
                        content: t.dashboard.modelTestPage.greeting
                    }
                ]);
            } catch (error) {
                console.error(error);
            }
        };
        fetchCompanyAndGreet();
    }, [t.dashboard.modelTestPage.greeting]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: input
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Ensure we have the latest token
            const currentToken = token || localStorage.getItem('token');

            if (!currentToken) {
                alert(t.dashboard.modelTestPage.loginRequired);
                return;
            }

            const res = await axios.post(
                `${BACKEND_URL}/chat`,
                { prompt: input },
                { headers: { Authorization: `Bearer ${currentToken}` } }
            );

            const botMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: res.data.reply
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error(error);
            const errorMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: t.dashboard.modelTestPage.errorResponse,
                error: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="model-test-container animate-fade-in">
            <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="page-title"
            >
                {t.dashboard.modelTestPage.title}
            </motion.h1>
            <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="page-subtitle"
            >
                {t.dashboard.modelTestPage.subtitle}
            </motion.p>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="chat-interface card"
            >
                <div className="chat-messages">
                    {messages.map((msg) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={msg.id}
                            className={`message ${msg.role} ${msg.error ? 'error' : ''}`}
                        >
                            <div className="message-bubble">
                                {msg.content}
                            </div>
                        </motion.div>
                    ))}
                    {loading && (
                        <div className="message assistant">
                            <div className="message-bubble typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form className="chat-input-form" onSubmit={sendMessage}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t.dashboard.modelTestPage.placeholder}
                        disabled={loading}
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
                        <i className="fas fa-paper-plane"></i>
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default ModelTest;
