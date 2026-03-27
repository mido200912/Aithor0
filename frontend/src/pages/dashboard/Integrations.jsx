import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { motion } from 'framer-motion';
import './Integrations.css';

const Integrations = () => {
    const { t } = useLanguage();
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showWhatsappModal, setShowWhatsappModal] = useState(false);
    const [whatsappData, setWhatsappData] = useState({ phoneNumberId: '', accessToken: '' });
    
    // Telegram State
    const [showTelegramModal, setShowTelegramModal] = useState(false);
    const [telegramData, setTelegramData] = useState({ botToken: '', commands: [] });
    const [newCommand, setNewCommand] = useState({ command: '', description: '', category: '', type: 'ai', message: '', successMessage: '', products: [] });
    const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '' });

    const [availableIntegrations, setAvailableIntegrations] = useState([
        {
            id: 'whatsapp',
            name: 'WhatsApp Business',
            icon: 'whatsapp',
            color: '#25d366',
            descKey: 'whatsappDesc',
            available: false
        },
        {
            id: 'telegram',
            name: 'Telegram Bot',
            icon: 'telegram',
            color: '#26A5E4',
            descKey: 'telegramDesc',
            available: true
        },
        {
            id: 'shopify',
            name: 'Shopify',
            icon: 'shopify',
            color: '#96bf48',
            descKey: 'shopifyDesc',
            available: false
        },
        {
            id: 'instagram',
            name: 'Instagram',
            icon: 'instagram',
            color: '#e4405f',
            descKey: 'instagramDesc',
            available: false
        },
        {
            id: 'facebook',
            name: 'Facebook Messenger',
            icon: 'facebook-f',
            color: '#1877f2',
            descKey: 'messengerDesc',
            available: false
        },
        {
            id: 'tiktok',
            name: 'TikTok',
            icon: 'tiktok',
            color: '#000000',
            descKey: 'tiktokDesc',
            available: false
        }
    ]);

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchIntegrations();

        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const platform = urlParams.get('platform');

        if (status && platform) {
            if (status === 'success') {
                alert(`✅ ${t.dashboard.integrationsPage.success} ${platform}!`);
            } else {
                alert(`❌ ${t.dashboard.integrationsPage.failed} ${platform}`);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
            fetchIntegrations();
        }
    }, []);

    const fetchIntegrations = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${BACKEND_URL}/integration-manager`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIntegrations(res.data);
        } catch (error) {
            console.error('Error fetching integrations:', error);
        } finally {
            setLoading(false);
        }
    };

    const getIntegrationStatus = (platformId) => {
        const integration = integrations.find(int => int.platform === platformId);
        if (!integration) return 'disconnected';
        return integration.isActive ? 'connected' : 'disconnected';
    };

    const handleConnect = async (integration) => {
        if (!integration.available) return;

        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            if (integration.id === 'facebook' || integration.id === 'instagram') {
                const companyRes = await axios.get(`${BACKEND_URL}/company`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const companyId = companyRes.data._id;
                window.location.href = `${BACKEND_URL}/integrations/meta/login?companyId=${companyId}`;
            }
            else if (integration.id === 'whatsapp') {
                setShowWhatsappModal(true);
            }
            else if (integration.id === 'tiktok') {
                const companyRes = await axios.get(`${BACKEND_URL}/company`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const companyId = companyRes.data._id;
                window.location.href = `${BACKEND_URL}/integrations/tiktok/login?companyId=${companyId}`;
            }
            else if (integration.id === 'shopify') {
                const shopUrl = prompt(t.dashboard.integrationsPage.shopifyPrompt);
                if (!shopUrl) return;
                const companyRes = await axios.get(`${BACKEND_URL}/company`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const companyId = companyRes.data._id;
                window.location.href = `${BACKEND_URL}/integrations/shopify/login?shop=${shopUrl}&companyId=${companyId}`;
            }
            else if (integration.id === 'telegram') {
                setShowTelegramModal(true);
            }
        } catch (error) {
            console.error('Error connecting integration:', error);
            alert(t.dashboard.integrationsPage.errorConnect || 'Error connecting. Try again later.');
        }
    };

    const handleTelegramSubmit = async (e) => {
        e.preventDefault();
        try {
            // Log payload before sending
            console.log("📤 Sending to backend:", JSON.stringify(telegramData, null, 2));
            
            await axios.post(`${BACKEND_URL}/integration-manager/telegram`, telegramData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(t.language === 'ar' ? 'تم ربط تليجرام بنجاح!' : 'Telegram connected successfully!');
            setShowTelegramModal(false);
            setTelegramData({ botToken: '', commands: [] });
            fetchIntegrations();
        } catch (error) {
            console.error('Error configuring Telegram:', error);
            alert(t.language === 'ar' ? 'حدث خطأ. تأكد من البوت توكن.' : 'Validation failed. Check your bot token.');
        }
    };

    // ─── ALL state updates use functional form to prevent stale closure bugs ───
    const updateNewCommand = (field, value) => {
        setNewCommand(prev => ({ ...prev, [field]: value }));
    };

    const addProductToCommand = () => {
        if (!newProduct.name) return;
        setNewCommand(prev => ({
            ...prev,
            products: [...(prev.products || []), { name: newProduct.name, price: newProduct.price, description: newProduct.description }]
        }));
        setNewProduct({ name: '', price: '', description: '' });
    };

    const addTelegramCommand = () => {
        if (!newCommand.command) return;
        console.log("✅ Adding command:", JSON.stringify(newCommand));
        setTelegramData(prev => ({
            ...prev,
            commands: [...prev.commands, { ...newCommand }]
        }));
        setNewCommand({ command: '', description: '', category: '', type: 'ai', message: '', successMessage: '', products: [] });
        setNewProduct({ name: '', price: '', description: '' });
    };

    const removeTelegramCommand = (index) => {
        setTelegramData(prev => ({
            ...prev,
            commands: prev.commands.filter((_, i) => i !== index)
        }));
    };

    const removeProductFromCommand = (idx) => {
        setNewCommand(prev => ({
            ...prev,
            products: prev.products.filter((_, i) => i !== idx)
        }));
    };

    const handleWhatsappSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${BACKEND_URL}/integration-manager/whatsapp`, whatsappData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`✅ ${t.dashboard.integrationsPage.whatsappConfigSuccess || 'WhatsApp configured successfully'}`);
            setShowWhatsappModal(false);
            setWhatsappData({ phoneNumberId: '', accessToken: '' });
            fetchIntegrations();
        } catch (error) {
            console.error('Error configuring WhatsApp:', error);
            alert(t.dashboard.integrationsPage.errorConnect);
        }
    };

    const handleToggle = async (platformId) => {
        const integration = integrations.find(int => int.platform === platformId);
        if (!integration) return;

        try {
            await axios.patch(`${BACKEND_URL}/integration-manager/${integration.id}/toggle`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchIntegrations();
        } catch (error) {
            console.error('Error toggling integration:', error);
            alert(t.dashboard.integrationsPage.errorGen);
        }
    };

    const handleDisconnect = async (platformId) => {
        const integration = integrations.find(int => int.platform === platformId);
        if (!integration) return;

        if (!confirm(t.dashboard.integrationsPage.confirmDisconnect)) return;

        try {
            await axios.delete(`${BACKEND_URL}/integration-manager/${integration.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchIntegrations();
        } catch (error) {
            console.error('Error disconnecting integration:', error);
            alert(t.dashboard.integrationsPage.errorDisconnect);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1 }
    };

    return (
        <div className="integrations-page animate-fade-in">
            <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="page-title"
            >
                {t.dashboard.integrationsPage.title}
            </motion.h1>
            <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="page-subtitle"
            >
                {t.dashboard.integrationsPage.subtitle}
            </motion.p>

            {/* NEW: Web Widget Section (Not locked) */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="widget-integration-section"
            >
                <div className="integration-item connected" style={{ marginBottom: '20px', cursor: 'default' }}>
                    <div className="integration-icon" style={{ backgroundColor: '#6C63FF15', color: '#6C63FF' }}>
                        <i className="fas fa-code"></i>
                    </div>
                    <div className="integration-info">
                        <h3>{t.language === 'ar' ? 'ودجت الموقع (Web Widget)' : 'Web Widget'}</h3>
                        <p>{t.language === 'ar' ? 'أضف شات بوت Aithor لموقعك الإلكتروني بضغطة واحدة.' : 'Add Aithor chatbot to your website with a single script.'}</p>
                    </div>
                    <div className="integration-action">
                        <button 
                            className="btn btn-primary"
                            onClick={() => {
                                const btn = document.getElementById('copy-widget-btn');
                                const apiKey = JSON.parse(localStorage.getItem('user'))?.apiKey || 'YOUR_API_KEY';
                                const code = `<script \n  src="https://aithor0.vercel.app/widget.js" \n  data-api-key="${apiKey}" \n  data-base-url="https://aithor0.vercel.app"\n></script>`;
                                navigator.clipboard.writeText(code);
                                const originalText = btn.innerText;
                                btn.innerText = t.language === 'ar' ? 'تم النسخ!' : 'Copied!';
                                setTimeout(() => btn.innerText = originalText, 2000);
                            }}
                            id="copy-widget-btn"
                        >
                            <i className="fas fa-copy" style={{ marginInlineEnd: '8px' }}></i>
                            {t.language === 'ar' ? 'نسخ الكود' : 'Copy Code'}
                        </button>
                    </div>
                </div>
                
                <div className="widget-code-preview">
                    <pre>
                        <code>
{`<script 
  src="https://aithor0.vercel.app/widget.js" 
  data-api-key="${JSON.parse(localStorage.getItem('user'))?.apiKey || 'YOUR_API_KEY'}" 
  data-base-url="https://aithor-v1.vercel.app"
></script>`}
                        </code>
                    </pre>
                </div>
            </motion.div>

            <div className="section-divider" style={{ margin: '40px 0', borderTop: '1px dashed var(--border-color)', opacity: 0.5 }}></div>

            {loading ? (
                <p style={{ textAlign: 'center', padding: '40px' }}>{t.dashboard.integrationsPage.loading}</p>
            ) : (
                <div style={{ position: 'relative' }}>
                    <motion.div
                        className="integrations-list"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                    {availableIntegrations.map(integration => {
                        const status = getIntegrationStatus(integration.id);

                        return (
                            <motion.div variants={itemVariants} key={integration.id} className={`integration-item ${status}`}>
                                <div className="integration-icon" style={{ backgroundColor: `${integration.color}15`, color: integration.color }}>
                                    <i className={`fab fa-${integration.icon}`}></i>
                                </div>
                                <div className="integration-info">
                                    <h3>{integration.name}</h3>
                                    <p>{t.integrations[integration.descKey]}</p>
                                </div>
                                <div className="integration-action">
                                    {!integration.available ? (
                                        <span className="badge badge-gray">{t.integrations.soon}</span>
                                    ) : status === 'connected' ? (
                                        <>
                                            <button
                                                className="btn btn-outline"
                                                onClick={() => handleToggle(integration.id)}
                                            >
                                                {t.dashboard.integrationsPage.pause}
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                style={{ marginInlineEnd: '10px' }}
                                                onClick={() => handleDisconnect(integration.id)}
                                            >
                                                {t.dashboard.integrationsPage.disconnect}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => handleConnect(integration)}
                                        >
                                            {t.dashboard.integrationsPage.connect}
                                        </button>
                                    )}
                                </div>
                                {status === 'connected' && <div className="status-dot"></div>}
                            </motion.div>
                        );
                    })}
                    </motion.div>
                </div>
            )}

            {/* WhatsApp Modal */}
            {showWhatsappModal && (
                <div className="modal-overlay" onClick={() => setShowWhatsappModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{t.dashboard.integrationsPage.whatsappModalTitle || 'WhatsApp Integration'}</h2>
                        <form onSubmit={handleWhatsappSubmit} className="whatsapp-form">
                            <div className="form-group">
                                <label>{t.dashboard.integrationsPage.whatsappPhoneNumberId || 'Phone Number ID'}</label>
                                <input
                                    type="text"
                                    required
                                    value={whatsappData.phoneNumberId}
                                    onChange={(e) => setWhatsappData({ ...whatsappData, phoneNumberId: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t.dashboard.integrationsPage.whatsappAccessToken || 'Access Token'}</label>
                                <textarea
                                    required
                                    rows="3"
                                    value={whatsappData.accessToken}
                                    onChange={(e) => setWhatsappData({ ...whatsappData, accessToken: e.target.value })}
                                ></textarea>
                            </div>
                            <p className="help-text" style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
                                {t.dashboard.integrationsPage.whatsappHelp || 'Get these details from the Meta Developer Dashboard.'}
                            </p>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowWhatsappModal(false)}>
                                    {t.dashboard.integrationsPage.whatsappCancel || 'Cancel'}
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {t.dashboard.integrationsPage.whatsappSave || 'Save & Connect'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Telegram Modal */}
            {showTelegramModal && (
                <div className="modal-overlay" onClick={() => setShowTelegramModal(false)}>
                    <div className="modal-content telegram-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="fab fa-telegram" style={{ color: '#26A5E4' }} />
                            {t.language === 'ar' ? 'إعداد تليجرام' : 'Telegram Setup'}
                        </h2>
                        <form onSubmit={handleTelegramSubmit} style={{ 
                            maxHeight: '75vh', 
                            overflowY: 'auto', 
                            paddingRight: '8px'
                        }}>
                            <div className="form-group">
                                <label>{t.language === 'ar' ? 'Bot Token (من @BotFather)' : 'Bot Token (from @BotFather)'}</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="123456789:ABCDefghIJKlmnoPQRstUVwxYZ"
                                    value={telegramData.botToken}
                                    onChange={(e) => setTelegramData(prev => ({ ...prev, botToken: e.target.value }))}
                                    style={{ borderRadius: '10px', padding: '10px 14px', border: '1px solid #ddd' }}
                                />
                            </div>

                            <div style={{ marginTop: '25px', borderTop: '2px solid #f0f0f0', paddingTop: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#26A5E415', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#26A5E4' }}>
                                        <i className="fas fa-terminal" style={{ fontSize: '0.9rem' }} />
                                    </div>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#333' }}>
                                        {t.language === 'ar' ? 'إعداد الأوامر الذكية' : 'Smart Command Setup'}
                                    </h3>
                                </div>
                                
                                <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '20px', lineHeight: '1.5' }}>
                                    {t.language === 'ar' ? 'قم ببناء تجربة تفاعلية لعملائك عبر تليجرام. حدد الأوامر، المنتجات، والردود التلقائية.' : 'Build an interactive experience for your customers via Telegram.'}
                                </p>

                                {/* Saved commands list */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                                    {telegramData.commands.map((cmd, idx) => (
                                        <div key={idx} style={{ position: 'relative', background: '#fff', padding: '15px', borderRadius: '15px', border: '1px solid #e8e8e8', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span style={{ fontWeight: 800, color: '#26A5E4', fontSize: '0.95rem' }}>/{cmd.command}</span>
                                                <span style={{ fontSize: '0.7rem', background: '#f0f0f0', padding: '2px 8px', borderRadius: '10px', color: '#888' }}>{cmd.type}</span>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '4px' }}><b>📝 {t.language === 'ar' ? 'التصنيف:' : 'Category:'}</b> {cmd.category}</div>
                                            {cmd.products?.length > 0 && <div style={{ fontSize: '0.8rem', color: '#26A5E4' }}><b>📦 {cmd.products.length} {t.language === 'ar' ? 'منتجات' : 'Products'}</b></div>}
                                            
                                            <button type="button" onClick={() => removeTelegramCommand(idx)} style={{ position: 'absolute', top: '12px', right: '12px', color: '#ff4d4f', background: '#fff', border: '1px solid #ff4d4f30', cursor: 'pointer', width: '24px', height: '24px', borderRadius: '50%', fontSize: '0.7rem' }}>
                                                <i className="fas fa-trash" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* New command builder */}
                                <div style={{ background: '#fbfcfe', border: '1px solid #e6ebf5', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '15px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: '600' }}>{t.language === 'ar' ? 'اسم الأمر (بدون /)' : 'Command ID'}</label>
                                            <input type="text" placeholder="shopping" value={newCommand.command}
                                                onChange={e => updateNewCommand('command', e.target.value)}
                                                style={{ borderRadius: '10px', padding: '10px 14px', border: '1px solid #ddd' }} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: '600' }}>{t.language === 'ar' ? 'التصنيف' : 'Category'}</label>
                                            <input type="text" placeholder={t.language === 'ar' ? 'مبيعات' : 'Sales'} value={newCommand.category}
                                                onChange={e => updateNewCommand('category', e.target.value)}
                                                style={{ borderRadius: '10px', padding: '10px 14px', border: '1px solid #ddd' }} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: '600' }}>{t.language === 'ar' ? 'نوع الرد' : 'Logic Type'}</label>
                                            <select value={newCommand.type} onChange={e => updateNewCommand('type', e.target.value)}
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ddd', background: 'white' }}>
                                                <option value="ai">🤖 AI Reply</option>
                                                <option value="fixed_message">💬 Fixed Message</option>
                                                <option value="product_menu">🛍️ Product Menu + Order</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Dynamic inputs based on type */}
                                    {newCommand.type !== 'ai' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: '600' }}>{t.language === 'ar' ? 'رسالة الترحيب' : 'Intro Message'}</label>
                                                <textarea rows="3" value={newCommand.message}
                                                    placeholder={t.language === 'ar' ? 'مرحباً بك، اختر طلبك...' : 'Welcome! Please choose...'}
                                                    onChange={e => updateNewCommand('message', e.target.value)}
                                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.85rem' }} />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: '600' }}>{t.language === 'ar' ? 'رسالة النجاح (بعد الرقم)' : 'Success Message'}</label>
                                                <textarea rows="3" value={newCommand.successMessage}
                                                    placeholder={t.language === 'ar' ? 'تم استلام طلبك، سنتصل بك قريباً!' : 'Success! We will call you soon.'}
                                                    onChange={e => updateNewCommand('successMessage', e.target.value)}
                                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.85rem' }} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Product Menu Management */}
                                    {newCommand.type === 'product_menu' && (
                                        <div style={{ background: '#fff', borderRadius: '15px', padding: '18px', border: '1px solid #e0e0e0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: '#333', fontSize: '0.9rem', fontWeight: '700' }}>
                                                <i className="fas fa-boxes" /> {t.language === 'ar' ? 'قائمة المنتجات' : 'Products List'}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                                                {(newCommand.products || []).map((p, i) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: '#f8fbfc', borderRadius: '10px', border: '1px solid #ececec' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{p.name} <small style={{ color: '#26A5E4', marginInlineStart: '10px' }}>{p.price}</small></span>
                                                        <button type="button" onClick={() => removeProductFromCommand(i)} style={{ color: '#ff4d4f', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                            <i className="fas fa-times" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                <input type="text" placeholder={t.language === 'ar' ? 'اسم المنتج' : 'Product name'} value={newProduct.name}
                                                    onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                                                    style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                                                <input type="text" placeholder={t.language === 'ar' ? 'السعر' : 'Price'} value={newProduct.price}
                                                    onChange={e => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                                                <button type="button" onClick={addProductToCommand}
                                                    style={{ width: '42px', height: '42px', background: '#26A5E4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem' }}>
                                                    <i className="fas fa-plus" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <button type="button" onClick={addTelegramCommand}
                                        style={{ width: '100%', padding: '12px', background: '#26A5E4', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(38, 165, 228, 0.2)' }}>
                                        <i className="fas fa-check-circle" />
                                        {t.language === 'ar' ? 'حفظ هذا الأمر والبدء في آخر' : 'Add Command to Platform'}
                                    </button>
                                </div>
                            </div>

                            <div className="modal-actions" style={{ marginTop: '30px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowTelegramModal(false)}>
                                    {t.dashboard.integrationsPage.whatsappCancel || 'Cancel'}
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ background: '#26A5E4', borderColor: '#26A5E4' }}>
                                    {t.dashboard.integrationsPage.whatsappSave || 'Save & Connect'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Integrations;
