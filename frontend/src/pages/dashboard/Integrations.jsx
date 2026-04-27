import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { secureStorage } from '../../utils/secureStorage';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../components/Toast';
import { Link } from 'react-router-dom';
import './Integrations.css';

const Integrations = () => {
    const { t, language } = useLanguage();
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const showToast = (type, title, message = '') => {
        const fullMsg = message ? `${title}: ${message}` : title;
        if (type === 'success') toast.success(fullMsg);
        else if (type === 'error') toast.error(fullMsg);
        else if (type === 'warning') toast.warning(fullMsg);
        else toast.info(fullMsg);
    };
    const [showWhatsappModal, setShowWhatsappModal] = useState(false);
    const [whatsappData, setWhatsappData] = useState({ phoneNumberId: '', accessToken: '' });

    // Instagram State
    const [showInstagramModal, setShowInstagramModal] = useState(false);
    const [instagramData, setInstagramData] = useState({ pageId: '', igAccountId: '', accessToken: '' });
    
    // Telegram State
    const [showTelegramModal, setShowTelegramModal] = useState(false);
    const [telegramData, setTelegramData] = useState({ botToken: '', commands: [] });
    const [newCommand, setNewCommand] = useState({ command: '', description: '', category: '', type: 'ai', message: '', successMessage: '', products: [] });
    const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '' });

    // Reveal Token state
    const [revealOtpVisible, setRevealOtpVisible] = useState(false);
    const [revealOtpCode, setRevealOtpCode] = useState('');
    const [isRequestingOtp, setIsRequestingOtp] = useState(false);
    const [isVerifyingRevealOtp, setIsVerifyingRevealOtp] = useState(false);
    const [isTelegramTokenRevealed, setIsTelegramTokenRevealed] = useState(false);
    const [isTelegramEditing, setIsTelegramEditing] = useState(false);

    // useRef always holds the LATEST value - immune to stale closures
    const newCommandRef = useRef(newCommand);
    useEffect(() => { newCommandRef.current = newCommand; }, [newCommand]);

    const [availableIntegrations, setAvailableIntegrations] = useState([
        {
            id: 'whatsapp',
            name: 'WhatsApp Business',
            icon: 'whatsapp',
            color: '#25d366',
            descKey: 'whatsappDesc',
            available: true
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
            available: true
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

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://aithor1.vercel.app/api';
    const token = secureStorage.getItem('token');

    useEffect(() => {
        fetchIntegrations();

        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const platform = urlParams.get('platform');

        if (status && platform) {
            if (status === 'success') {
                showToast('success', t.language === 'ar' ? 'تم الربط!' : 'Connected!', `${platform} ${t.language === 'ar' ? 'تم ربطه بنجاح' : 'connected successfully'}`);
            } else {
                showToast('error', t.language === 'ar' ? 'فشل الربط' : 'Connection Failed', platform);
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
        return integration.isActive ? 'connected' : 'paused';
    };

    const handleConnect = async (integration) => {
        if (!integration.available) return;

        try {
            const userStr = secureStorage.getItem('user');
            const user = userStr ? userStr : null;

            if (integration.id === 'facebook') {
                const companyRes = await axios.get(`${BACKEND_URL}/company`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const companyId = companyRes.data._id;
                window.location.href = `${BACKEND_URL}/integrations/meta/login?companyId=${companyId}`;
            }
            else if (integration.id === 'instagram') {
                setShowInstagramModal(true);
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
                setIsTelegramEditing(false);
                setIsTelegramTokenRevealed(false);
                setShowTelegramModal(true);
            }
        } catch (error) {
            console.error('Error connecting integration:', error);
            showToast('error', t.language === 'ar' ? 'خطأ في الربط' : 'Connection Error', t.dashboard.integrationsPage.errorConnect || 'Error connecting. Try again later.');
        }
    };

    const handleTelegramSubmit = async (e) => {
        e.preventDefault();
        try {
            // Read from REF (always latest) not from state (may be stale)
            const currentCmd = newCommandRef.current;
            let finalCommands = [...telegramData.commands];
            
            // Auto-include the current unsaved command
            if (currentCmd.command && currentCmd.command.trim() !== '') {
                // Validate: product_menu needs at least 3 products
                if (currentCmd.type === 'product_menu' && (currentCmd.products || []).length < 3) {
                    showToast('warning', t.language === 'ar' ? 'منتجات غير كافية' : 'Not Enough Products', t.language === 'ar' ? 'يجب إضافة 3 منتجات على الأقل لقائمة المنتجات!' : 'Product menu requires at least 3 products!');
                    return;
                }
                finalCommands.push({ ...currentCmd });
            }

            const payload = {
                botToken: telegramData.botToken,
                commands: finalCommands
            };

            // Debug alert to verify products
            const productCounts = finalCommands.map(c => `/${c.command}: ${(c.products || []).length} products`).join('\n');
            console.log("📤 Final payload:", JSON.stringify(payload, null, 2));

            await axios.post(`${BACKEND_URL}/integration-manager/telegram`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('success', t.language === 'ar' ? 'تم ربط تليجرام! 🚀' : 'Telegram Connected! 🚀', productCounts);
            setShowTelegramModal(false);
            setTelegramData({ botToken: '', commands: [] });
            const emptyCmd = { command: '', description: '', category: '', type: 'ai', message: '', successMessage: '', products: [] };
            setNewCommand(emptyCmd);
            newCommandRef.current = emptyCmd;
            fetchIntegrations();
        } catch (error) {
            console.error('Error configuring Telegram:', error);
            showToast('error', t.language === 'ar' ? 'خطأ في الربط' : 'Connection Failed', t.language === 'ar' ? 'تأكد من البوت توكن الصحيح.' : 'Check your bot token and try again.');
        }
    };

    // ─── ALL state updates sync the ref immediately ───
    const updateNewCommand = (field, value) => {
        setNewCommand(prev => {
            const updated = { ...prev, [field]: value };
            newCommandRef.current = updated; // Always sync ref
            return updated;
        });
    };

    const addProductToCommand = () => {
        if (!newProduct.name) {
            showToast('warning', t.language === 'ar' ? 'بيانات ناقصة' : 'Missing Data', t.language === 'ar' ? 'اكتب اسم المنتج الأول!' : 'Enter product name first!');
            return;
        }
        const productToAdd = { name: newProduct.name, price: newProduct.price, description: newProduct.description };
        setNewCommand(prev => {
            const updated = { ...prev, products: [...(prev.products || []), productToAdd] };
            // Sync the ref IMMEDIATELY so it's always up-to-date
            newCommandRef.current = updated;
            console.log(`📦 Product added! Total: ${updated.products.length}`, updated.products);
            return updated;
        });
        setNewProduct({ name: '', price: '', description: '' });
    };

    const addTelegramCommand = () => {
        // Read from REF (always latest) not from state
        const currentCmd = newCommandRef.current;
        if (!currentCmd.command) return;
        // Validate: product_menu needs at least 3 products
        if (currentCmd.type === 'product_menu' && (currentCmd.products || []).length < 3) {
            showToast('warning', t.language === 'ar' ? 'منتجات غير كافية' : 'Not Enough Products', t.language === 'ar' ? 'يجب إضافة 3 منتجات على الأقل!' : 'At least 3 products required!');
            return;
        }
        console.log("✅ Adding command from ref:", JSON.stringify(currentCmd));
        setTelegramData(prev => ({
            ...prev,
            commands: [...prev.commands, { ...currentCmd }]
        }));
        const emptyCmd = { command: '', description: '', category: '', type: 'ai', message: '', successMessage: '', products: [] };
        setNewCommand(emptyCmd);
        newCommandRef.current = emptyCmd;
        setNewProduct({ name: '', price: '', description: '' });
    };

    const removeTelegramCommand = (index) => {
        setTelegramData(prev => ({
            ...prev,
            commands: prev.commands.filter((_, i) => i !== index)
        }));
    };

    const removeProductFromCommand = (idx) => {
        setNewCommand(prev => {
            const updated = { ...prev, products: prev.products.filter((_, i) => i !== idx) };
            newCommandRef.current = updated;
            return updated;
        });
    };

    const handleWhatsappSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${BACKEND_URL}/integration-manager/whatsapp`, whatsappData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('success', t.language === 'ar' ? 'تم الربط!' : 'Connected!', t.dashboard.integrationsPage.whatsappConfigSuccess || 'WhatsApp configured successfully');
            setShowWhatsappModal(false);
            setWhatsappData({ phoneNumberId: '', accessToken: '' });
            fetchIntegrations();
        } catch (error) {
            console.error('Error configuring WhatsApp:', error);
            showToast('error', t.language === 'ar' ? 'خطأ' : 'Error', t.dashboard.integrationsPage.errorConnect);
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
            const action = integration.isActive ? 
                (t.language === 'ar' ? 'إيقاف مؤقت' : 'Paused') : 
                (t.language === 'ar' ? 'تفعيل' : 'Activated');
            showToast('info', action, `${integration.platform} ${action}`);
        } catch (error) {
            console.error('Error toggling integration:', error);
            showToast('error', t.language === 'ar' ? 'خطأ' : 'Error', t.dashboard.integrationsPage.errorGen);
        }
    };

    const handleEdit = (platformId) => {
        const integration = integrations.find(int => int.platform === platformId);
        if (!integration) return;

        if (platformId === 'telegram') {
            setIsTelegramEditing(true);
            setIsTelegramTokenRevealed(false);
            setRevealOtpVisible(false);
            setTelegramData({
                botToken: '', // Hide by default
                commands: integration.settings?.commands || []
            });
            setShowTelegramModal(true);
        } else if (platformId === 'whatsapp') {
            setWhatsappData({
                phoneNumberId: integration.credentials?.phoneNumberId || '',
                accessToken: integration.credentials?.accessToken || ''
            });
            setShowWhatsappModal(true);
        } else if (platformId === 'instagram') {
            setInstagramData({
                pageId: integration.credentials?.pageId || '',
                igAccountId: integration.credentials?.igAccountId || '',
                accessToken: integration.credentials?.accessToken || ''
            });
            setShowInstagramModal(true);
        }
    };

    const handleInstagramSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${BACKEND_URL}/integration-manager/instagram`, instagramData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('success', t.language === 'ar' ? 'تم الربط!' : 'Connected!', t.language === 'ar' ? 'تم حفظ إعدادات إنستاجرام' : 'Instagram settings saved');
            setShowInstagramModal(false);
            setInstagramData({ pageId: '', igAccountId: '', accessToken: '' });
            fetchIntegrations();
        } catch (error) {
            console.error('Error configuring Instagram:', error);
            showToast('error', t.language === 'ar' ? 'خطأ' : 'Error', 'Failed to configure Instagram');
        }
    };

    const requestRevealOtp = async () => {
        setIsRequestingOtp(true);
        try {
            await axios.post(`${BACKEND_URL}/integration-manager/request-reveal-otp`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRevealOtpVisible(true);
            showToast('success', t.language === 'ar' ? 'تم إرسال الكود!' : 'OTP Sent!', t.language === 'ar' ? 'تفقد بريدك الإلكتروني.' : 'Check your email for the verification code.');
        } catch (error) {
            console.error('Error requesting reveal OTP:', error);
            showToast('error', t.language === 'ar' ? 'فشل إرسال الكود' : 'Failed to send OTP');
        } finally {
            setIsRequestingOtp(false);
        }
    };

    const verifyRevealOtp = async () => {
        if (!revealOtpCode) return;
        setIsVerifyingRevealOtp(true);
        try {
            const res = await axios.post(`${BACKEND_URL}/integration-manager/verify-reveal-otp`, {
                otp: revealOtpCode,
                platform: 'telegram'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setTelegramData(prev => ({ ...prev, botToken: res.data.botToken }));
            setIsTelegramTokenRevealed(true);
            setRevealOtpVisible(false);
            showToast('success', t.language === 'ar' ? 'تم التحقق!' : 'Verified!', t.language === 'ar' ? 'تم كشف التوكن.' : 'Token revealed successfully.');
        } catch (error) {
            console.error('Error verifying reveal OTP:', error);
            showToast('error', t.language === 'ar' ? 'كود غير صحيح' : 'Invalid OTP');
        } finally {
            setIsVerifyingRevealOtp(false);
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
            showToast('error', t.language === 'ar' ? 'خطأ' : 'Error', t.dashboard.integrationsPage.errorDisconnect);
        }
    };

    const closeTelegramModal = () => {
        setShowTelegramModal(false);
        setIsTelegramEditing(false);
        setIsTelegramTokenRevealed(false);
        setRevealOtpVisible(false);
        setRevealOtpCode('');
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
            {/* Toast Notification */}
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
                        <p>{t.language === 'ar' ? 'أضف شات بوت VOXIO لموقعك الإلكتروني بضغطة واحدة.' : 'Add VOXIO chatbot to your website with a single script.'}</p>
                    </div>
                    <div className="integration-action">
                        <Link to="/dashboard/widget" className="btn btn-primary">
                            <i className="fas fa-cog" style={{ marginInlineEnd: '8px' }}></i>
                            {language === 'ar' ? 'إعداد الودجت' : 'Configure Widget'}
                        </Link>
                    </div>
                </div>
                
                <div className="integration-footer" style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-info-circle" style={{ color: 'var(--primary-color)' }}></i>
                        {language === 'ar' 
                            ? 'أفضل طريقة لزيادة مبيعاتك هي إضافة الودجت لموقعك. اضغط على "إعداد الودجت" لمعرفة التفاصيل.' 
                            : 'The best way to increase sales is by adding the widget to your site. Click "Configure Widget" for details.'}
                    </p>
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
                                    ) : (status === 'connected' || status === 'paused') ? (
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button
                                                className={`btn ${status === 'paused' ? 'btn-success' : 'btn-outline'}`}
                                                onClick={() => handleToggle(integration.id)}
                                            >
                                                {status === 'paused' ? 
                                                    (t.language === 'ar' ? 'تفعيل' : 'Resume') : 
                                                    (t.dashboard.integrationsPage.pause || 'Pause')
                                                }
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => handleEdit(integration.id)}
                                            >
                                                <i className="fas fa-edit" style={{ marginInlineEnd: '4px' }}></i>
                                                {t.language === 'ar' ? 'تعديل' : 'Edit'}
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => handleDisconnect(integration.id)}
                                            >
                                                {t.dashboard.integrationsPage.disconnect}
                                            </button>
                                        </div>
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
                                {status === 'paused' && <div className="status-dot paused"></div>}
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
                <div className="modal-overlay" onClick={closeTelegramModal}>
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
                                
                                {isTelegramEditing && !isTelegramTokenRevealed ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {!revealOtpVisible ? (
                                            <button 
                                                type="button" 
                                                className="btn btn-outline"
                                                onClick={requestRevealOtp}
                                                disabled={isRequestingOtp}
                                                style={{ width: '100%', height: '45px', borderStyle: 'dashed' }}
                                            >
                                                {isRequestingOtp ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-eye" style={{ marginInlineEnd: '8px' }} />}
                                                {t.language === 'ar' ? 'كشف الـ Token (يتطلب OTP)' : 'Reveal Token (Requires OTP)'}
                                            </button>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input
                                                    type="text"
                                                    placeholder={t.language === 'ar' ? 'أدخل الكود (6 أرقام)' : 'Enter Code (6 digits)'}
                                                    value={revealOtpCode}
                                                    onChange={(e) => setRevealOtpCode(e.target.value)}
                                                    style={{ flex: 1, borderRadius: '10px', padding: '10px 14px', border: '1px solid #26A5E4' }}
                                                />
                                                <button 
                                                    type="button" 
                                                    className="btn btn-primary"
                                                    onClick={verifyRevealOtp}
                                                    disabled={isVerifyingRevealOtp}
                                                    style={{ background: '#26A5E4', padding: '0 20px' }}
                                                >
                                                    {isVerifyingRevealOtp ? <i className="fas fa-spinner fa-spin" /> : (t.language === 'ar' ? 'تأكيد' : 'Verify')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        required
                                        placeholder="123456789:ABCDefghIJKlmnoPQRstUVwxYZ"
                                        value={telegramData.botToken}
                                        onChange={(e) => setTelegramData(prev => ({ ...prev, botToken: e.target.value }))}
                                        style={{ width: '100%', borderRadius: '10px', padding: '10px 14px', border: '1px solid #ddd' }}
                                    />
                                )}
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
                                <button type="button" className="btn btn-outline" onClick={closeTelegramModal}>
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

            {/* Instagram Modal */}
            {showInstagramModal && (
                <div className="modal-overlay" onClick={() => setShowInstagramModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{t.language === 'ar' ? 'ربط إنستاجرام (API)' : 'Instagram Integration (API)'}</h2>
                        <form onSubmit={handleInstagramSubmit} className="whatsapp-form">
                            <div className="form-group">
                                <label>{t.language === 'ar' ? 'معرف الصفحة (Page ID)' : 'Page ID'}</label>
                                <input
                                    type="text"
                                    required
                                    value={instagramData.pageId}
                                    onChange={(e) => setInstagramData({ ...instagramData, pageId: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t.language === 'ar' ? 'معرف إنستاجرام (IG Account ID)' : 'IG Account ID'}</label>
                                <input
                                    type="text"
                                    required
                                    value={instagramData.igAccountId}
                                    onChange={(e) => setInstagramData({ ...instagramData, igAccountId: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t.language === 'ar' ? 'رمز الوصول (Access Token)' : 'Access Token'}</label>
                                <textarea
                                    required
                                    rows="3"
                                    value={instagramData.accessToken}
                                    onChange={(e) => setInstagramData({ ...instagramData, accessToken: e.target.value })}
                                ></textarea>
                            </div>
                            <p className="help-text" style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
                                {t.language === 'ar' ? 'احصل على هذه البيانات من منصة مطوري ميتا.' : 'Get these details from the Meta Developer Dashboard.'}
                            </p>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowInstagramModal(false)}>
                                    {t.language === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ background: '#E4405F', borderColor: '#E4405F' }}>
                                    {t.language === 'ar' ? 'حفظ وربط' : 'Save & Connect'}
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
