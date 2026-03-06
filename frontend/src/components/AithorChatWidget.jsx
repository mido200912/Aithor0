import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './AithorChatWidget.css';

const AithorChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'assistant',
            content: 'مرحباً بك في AiThor! 👋 أنا مساعدك الذكي، كيف يمكنني مساعدتك في بناء وكيل الذكاء الاصطناعي الخاص بك؟'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const toggleChat = () => setIsOpen(!isOpen);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await axios.post(`${BACKEND_URL}/aithor-chat`, { prompt: input });

            const botMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: res.data.reply
            };
            setMessages(prev => [...prev, botMsg]);

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'assistant',
                content: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.',
                isError: true
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="aithor-widget-container">
            {/* Chat Button */}
            <button
                className={`widget-toggle-btn ${isOpen ? 'open' : ''}`}
                onClick={toggleChat}
                aria-label="Chat with AiThor"
            >
                {isOpen ? <i className="fas fa-times"></i> : <i className="fas fa-robot"></i>}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="widget-window animate-pop-up">
                    <div className="widget-header">
                        <div className="header-info">
                            <span className="status-dot"></span>
                            <h3>AiThor Assistant</h3>
                        </div>
                        <p>اسألني عن خدماتنا وطرق الاشتراك!</p>
                    </div>

                    <div className="widget-body">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`widget-msg ${msg.role} ${msg.isError ? 'error' : ''}`}>
                                <div className="msg-content">{msg.content}</div>
                            </div>
                        ))}
                        {loading && (
                            <div className="widget-msg assistant">
                                <div className="typing-dots">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="widget-footer" onSubmit={sendMessage}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="اكتب استفسارك..."
                            disabled={loading}
                        />
                        <button type="submit" disabled={!input.trim() || loading}>
                            <i className="fas fa-paper-plane"></i>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AithorChatWidget;
