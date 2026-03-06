import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './ModelTest.css';

const ModelTest = () => {
    const { token, user } = useAuth();
    const { theme } = useTheme();
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
                        content: 'مرحباً! أنا النموذج الذكي الخاص بشركتك. كيف يمكنني مساعدتك اليوم؟ يمكنك اختباري للتأكد من أنني أتبع التعليمات بشكل صحيح.'
                    }
                ]);
            } catch (error) {
                console.error(error);
            }
        };
        fetchCompanyAndGreet();
    }, []);

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
                alert("يرجى تسجيل الدخول مرة أخرى.");
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
                content: 'عذراً، حدث خطأ أثناء الاتصال بالخادم.',
                error: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="model-test-container animate-fade-in">
            <h1 className="page-title">اختبار النموذج</h1>
            <p className="page-subtitle">تحدث مع البوت لتجربة ردوده بناءً على بيانات شركتك وتعليماتك.</p>

            <div className="chat-interface card">
                <div className="chat-messages">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`message ${msg.role} ${msg.error ? 'error' : ''}`}>
                            <div className="message-bubble">
                                {msg.content}
                            </div>
                        </div>
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
                        placeholder="اكتب رسالتك هنا..."
                        disabled={loading}
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
                        <i className="fas fa-paper-plane"></i>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ModelTest;
