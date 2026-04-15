import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { secureStorage } from '../../utils/secureStorage';
import { motion, AnimatePresence } from 'framer-motion';
import './Integrations.css';

// ─── Toast Notification Component ────────────────────────────────────────────
const Toast = ({ toast, onClose }) => {
    if (!toast) return null;
    const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    const bg = colors[toast.type] || colors.info;
    const icon = icons[toast.type] || icons.info;

    return (
        <AnimatePresence>
            {toast && (
                <motion.div
                    initial={{ x: 400, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 400, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    style={{
                        position: 'fixed', top: '24px', right: '24px', zIndex: 99999,
                        minWidth: '340px', maxWidth: '440px',
                        background: '#fff', borderRadius: '16px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                        overflow: 'hidden', cursor: 'pointer'
                    }}
                    onClick={onClose}
                >
                    <div style={{ height: '4px', background: bg }} />
                    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        <div style={{
                            width: '38px', height: '38px', borderRadius: '10px',
                            background: `${bg}15`, color: bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.1rem', flexShrink: 0
                        }}>
                            <i className={`fas ${icon}`} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a', marginBottom: '4px' }}>
                                {toast.title}
                            </div>
                            <div style={{ fontSize: '0.83rem', color: '#666', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                                {toast.message}
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: '4px', fontSize: '0.9rem' }}>
                            <i className="fas fa-times" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const Integrations = () => {
    const { t } = useLanguage();
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    const showToast = (type, title, message = '') => {
        setToast({ type, title, message });
        setTimeout(() => setToast(null), 4500);
    };
    const [whatsappData, setWhatsappData] = useState({ phoneNumberId: '', accessToken: '', commands: [] });
    
    // Telegram State
    const [telegramData, setTelegramData] = useState({ botToken: '', commands: [] });

    // Instagram State
    const [instagramData, setInstagramData] = useState({ pageToken: '', commentRules: [] });
    const [isInstagramTokenRevealed, setIsInstagramTokenRevealed] = useState(false);
    const [isInstagramEditing, setIsInstagramEditing] = useState(false);
    const [newCommentRule, setNewCommentRule] = useState({ triggerWord: '', replyMessage: '' });

    const [newCommand, setNewCommand] = useState({ command: '', description: '', category: '', type: 'ai', message: '', successMessage: '', products: [] });
    const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '' });

    // Reveal Token state
    const [revealOtpVisible, setRevealOtpVisible] = useState(false);
    const [revealOtpCode, setRevealOtpCode] = useState('');
    const [isRequestingOtp, setIsRequestingOtp] = useState(false);
    const [isVerifyingRevealOtp, setIsVerifyingRevealOtp] = useState(false);
    const [isTelegramTokenRevealed, setIsTelegramTokenRevealed] = useState(false);
    const [isTelegramEditing, setIsTelegramEditing] = useState(false);
    const [isWhatsappTokenRevealed, setIsWhatsappTokenRevealed] = useState(false);
    const [isWhatsappEditing, setIsWhatsappEditing] = useState(false);

    const [selectedPlatform, setSelectedPlatform] = useState(null); // 'whatsapp', 'telegram', 'instagram'

    // useRef always holds the LATEST value - immune to stale closures
    const newCommandRef = useRef(newCommand);
    useEffect(() => { newCommandRef.current = newCommand; }, [newCommand]);

    const availableIntegrations = [
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
            id: 'instagram',
            name: 'Instagram',
            icon: 'instagram',
            color: '#e4405f',
            descKey: 'instagramDesc',
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
            id: 'tiktok',
            name: 'TikTok',
            icon: 'tiktok',
            color: '#000000',
            descKey: 'tiktokDesc',
            available: false
        }
    ];

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
    }, [t.language]);

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

    const handleConnect = (integration) => {
        if (!integration.available) return;
        setSelectedPlatform(integration.id);
        
        if (integration.id === 'telegram') {
            setTelegramData({ botToken: '', commands: [] });
            setIsTelegramTokenRevealed(false);
            setIsTelegramEditing(false);
        } else if (integration.id === 'whatsapp') {
            setWhatsappData({ phoneNumberId: '', accessToken: '', commands: [] });
            setIsWhatsappTokenRevealed(false);
            setIsWhatsappEditing(false);
        } else if (integration.id === 'instagram') {
            setInstagramData({ commentRules: [] });
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

    const addCommand = () => {
        // Read from REF (always latest) not from state
        const currentCmd = newCommandRef.current;
        if (!currentCmd.command) return;
        // Validate: product_menu needs at least 3 products
        if (currentCmd.type === 'product_menu' && (currentCmd.products || []).length < 3) {
            showToast('warning', t.language === 'ar' ? 'منتجات غير كافية' : 'Not Enough Products', t.language === 'ar' ? 'يجب إضافة 3 منتجات على الأقل!' : 'At least 3 products required!');
            return;
        }
        
        if (activeBuilder === 'telegram') {
            setTelegramData(prev => ({ ...prev, commands: [...prev.commands, { ...currentCmd }] }));
        } else if (activeBuilder === 'whatsapp') {
            setWhatsappData(prev => ({ ...prev, commands: [...prev.commands, { ...currentCmd }] }));
        }

        const emptyCmd = { command: '', description: '', category: '', type: 'ai', message: '', successMessage: '', products: [] };
        setNewCommand(emptyCmd);
        newCommandRef.current = emptyCmd;
        setNewProduct({ name: '', price: '', description: '' });
    };

    const removeCommand = (index, platform) => {
        if (platform === 'telegram') {
            setTelegramData(prev => ({ ...prev, commands: prev.commands.filter((_, i) => i !== index) }));
        } else if (platform === 'whatsapp') {
            setWhatsappData(prev => ({ ...prev, commands: prev.commands.filter((_, i) => i !== index) }));
        }
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
            const currentCmd = newCommandRef.current;
            let finalCommands = [...whatsappData.commands];
            if (currentCmd.command && currentCmd.command.trim() !== '') {
                if (currentCmd.type === 'product_menu' && (currentCmd.products || []).length < 3) {
                    showToast('warning', t.language === 'ar' ? 'منتجات غير كافية' : 'Not Enough Products', t.language === 'ar' ? 'يجب إضافة 3 منتجات على الأقل لقائمة المنتجات!' : 'Product menu requires at least 3 products!');
                    return;
                }
                finalCommands.push({ ...currentCmd });
            }

            const payload = {
                phoneNumberId: whatsappData.phoneNumberId,
                accessToken: whatsappData.accessToken,
                commands: finalCommands
            };

            await axios.post(`${BACKEND_URL}/integration-manager/whatsapp`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('success', t.language === 'ar' ? 'تم ربط واتساب!' : 'WhatsApp Connected!', t.dashboard.integrationsPage.whatsappConfigSuccess || 'WhatsApp configured successfully');
            backToList();
            
            const emptyCmd = { command: '', description: '', category: '', type: 'ai', message: '', successMessage: '', products: [] };
            setNewCommand(emptyCmd);
            newCommandRef.current = emptyCmd;

            fetchIntegrations();
        } catch (error) {
            console.error('Error configuring WhatsApp:', error);
            showToast('error', t.language === 'ar' ? 'خطأ' : 'Error', t.dashboard.integrationsPage.errorConnect);
        }
    };
    const handleInstagramSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${BACKEND_URL}/integration-manager/instagram/rules`, { 
                pageToken: instagramData.pageToken,
                commentRules: instagramData.commentRules 
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('success', t.language === 'ar' ? 'تم الحفظ!' : 'Saved!', t.language === 'ar' ? 'تم حفظ قواعد الرد التلقائي' : 'Auto-reply rules saved');
            backToList();
            fetchIntegrations();
        } catch (error) {
            console.error('Error configuring IG:', error);
            showToast('error', t.language === 'ar' ? 'خطأ' : 'Error', t.dashboard.integrationsPage.errorConnect);
        }
    };

    const addIgRule = () => {
        if (!newCommentRule.triggerWord || !newCommentRule.replyMessage) return;
        setInstagramData(prev => ({
            ...prev,
            commentRules: [...prev.commentRules, newCommentRule]
        }));
        setNewCommentRule({ triggerWord: '', replyMessage: '' });
    };

    const removeIgRule = (idx) => {
        setInstagramData(prev => ({
            ...prev,
            commentRules: prev.commentRules.filter((_, i) => i !== idx)
        }));
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

        setSelectedPlatform(platformId);

        if (platformId === 'telegram') {
            setIsTelegramEditing(true);
            setIsTelegramTokenRevealed(false);
            setTelegramData({
                botToken: '', // Hide initially
                commands: integration.settings?.commands || []
            });
        } else if (platformId === 'whatsapp') {
            setIsWhatsappEditing(true);
            setIsWhatsappTokenRevealed(false);
            setWhatsappData({
                phoneNumberId: '', // Hide
                accessToken: '',    // Hide
                commands: integration.settings?.commands || []
            });
        } else if (platformId === 'instagram') {
            setIsInstagramEditing(true);
            setIsInstagramTokenRevealed(false);
            setInstagramData({
                pageToken: '', // Hide initially
                commentRules: integration.settings?.commentRules || []
            });
        }
    };

    const backToList = () => {
        setSelectedPlatform(null);
        setIsWhatsappEditing(false);
        setIsWhatsappTokenRevealed(false);
        setIsTelegramEditing(false);
        setIsTelegramTokenRevealed(false);
        setIsInstagramEditing(false);
        setIsInstagramTokenRevealed(false);
        setRevealOtpVisible(false);
        setRevealOtpCode('');
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
            const platform = selectedPlatform === 'whatsapp' ? 'whatsapp' : 'telegram';
            const res = await axios.post(`${BACKEND_URL}/integration-manager/verify-reveal-otp`, {
                otp: revealOtpCode,
                platform
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (platform === 'telegram') {
                setTelegramData(prev => ({ ...prev, botToken: res.data.botToken }));
                setIsTelegramTokenRevealed(true);
            } else if (platform === 'instagram') {
                setInstagramData(prev => ({ ...prev, pageToken: res.data.pageToken }));
                setIsInstagramTokenRevealed(true);
            } else {
                setWhatsappData(prev => ({ 
                    ...prev, 
                    accessToken: res.data.accessToken,
                    phoneNumberId: res.data.phoneNumberId 
                }));
                setIsWhatsappTokenRevealed(true);
            }
            
            setRevealOtpVisible(false);
            showToast('success', t.language === 'ar' ? 'تم التحقق!' : 'Verified!', t.language === 'ar' ? 'تم كشف البيانات.' : 'Data revealed successfully.');
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
            <Toast toast={toast} onClose={() => setToast(null)} />
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
                        <button 
                            className="btn btn-primary"
                            onClick={() => {
                                const btn = document.getElementById('copy-widget-btn');
                                const apiKey = secureStorage.getItem('user')?.apiKey || 'YOUR_API_KEY';
                                const code = `<script \n  src="https://voxio1.vercel.app/widget.js" \n  data-api-key="${apiKey}" \n  data-base-url="https://voxio1.vercel.app"\n></script>`;
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
  src="https://voxio1.vercel.app/widget.js" 
  data-api-key="${secureStorage.getItem('user')?.apiKey || 'YOUR_API_KEY'}" 
  data-base-url="https://voxio-v1.vercel.app"
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
                    {!selectedPlatform ? (
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
                    ) : (
                        <div className="integration-detail-view animate-fade-in">
                            <button className="btn btn-outline" onClick={backToList} style={{ marginBottom: '20px' }}>
                                <i className="fas fa-arrow-left" style={{ marginInlineEnd: '8px' }}></i>
                                {t.language === 'ar' ? 'عودة للربط' : 'Back to Integrations'}
                            </button>

                            {/* WhatsApp View */}
                            {selectedPlatform === 'whatsapp' && (
                                <div className="detail-card" style={{ background: '#fff', borderRadius: '15px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <i className="fab fa-whatsapp" style={{ color: '#25d366' }} />
                                        {t.language === 'ar' ? 'إعداد واتساب بيزنس' : 'WhatsApp Business Setup'}
                                    </h2>
                                    
                                    {isWhatsappEditing && !isWhatsappTokenRevealed ? (
                                        <div style={{ marginTop: '20px', padding: '20px', background: '#f8fbfc', borderRadius: '15px', border: '1px solid #e8e8e8' }}>
                                            <h3 style={{ fontSize: '1rem', marginBottom: '15px', color: '#333' }}>
                                                {t.language === 'ar' ? 'البيانات محمية' : 'Protected Data'}
                                            </h3>
                                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '20px' }}>
                                                {t.language === 'ar' ? 'لعرض أو تعديل بيانات الاعتماد (Tokens)، يرجى طلب رمز التحقق وإدخاله.' : 'To view or edit credentials (Tokens), please request a verification code.'}
                                            </p>
                                            {!revealOtpVisible ? (
                                                <button 
                                                    type="button" 
                                                    className="btn btn-outline"
                                                    onClick={requestRevealOtp}
                                                    disabled={isRequestingOtp}
                                                    style={{ width: '100%', height: '45px', borderStyle: 'dashed', color: '#25d366', borderColor: '#25d366' }}
                                                >
                                                    {isRequestingOtp ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-eye" style={{ marginInlineEnd: '8px' }} />}
                                                    {t.language === 'ar' ? 'كشف البيانات (يتطلب OTP)' : 'Reveal Data (Requires OTP)'}
                                                </button>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <input
                                                        type="text"
                                                        placeholder={t.language === 'ar' ? 'أدخل الكود' : 'Enter Code'}
                                                        value={revealOtpCode}
                                                        onChange={(e) => setRevealOtpCode(e.target.value)}
                                                        style={{ flex: 1, borderRadius: '10px', padding: '10px 14px', border: '1px solid #25d366' }}
                                                    />
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-primary"
                                                        onClick={verifyRevealOtp}
                                                        disabled={isVerifyingRevealOtp}
                                                        style={{ background: '#25d366', borderColor: '#25d366', padding: '0 20px' }}
                                                    >
                                                        {isVerifyingRevealOtp ? <i className="fas fa-spinner fa-spin" /> : (t.language === 'ar' ? 'تأكيد' : 'Verify')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <form onSubmit={handleWhatsappSubmit} style={{ marginTop: '20px' }}>
                                            <div className="form-group">
                                                <label>{t.dashboard.integrationsPage.whatsappPhoneNumberId || 'Phone Number ID'}</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={whatsappData.phoneNumberId}
                                                    onChange={(e) => setWhatsappData({ ...whatsappData, phoneNumberId: e.target.value })}
                                                    style={{ border: '1px solid #ddd', borderRadius: '10px', padding: '12px' }}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>{t.dashboard.integrationsPage.whatsappAccessToken || 'Access Token'}</label>
                                                <textarea
                                                    required
                                                    rows="3"
                                                    value={whatsappData.accessToken}
                                                    onChange={(e) => setWhatsappData({ ...whatsappData, accessToken: e.target.value })}
                                                    style={{ border: '1px solid #ddd', borderRadius: '10px', padding: '12px', resize: 'vertical' }}
                                                ></textarea>
                                            </div>
                                            <p className="help-text" style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
                                                {t.dashboard.integrationsPage.whatsappHelp || 'Get these details from the Meta Developer Dashboard.'}
                                            </p>
                                            
                                            <div style={{ marginTop: '25px', borderTop: '2px solid #f0f0f0', paddingTop: '20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#25d36615', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25d366' }}>
                                                        <i className="fas fa-terminal" style={{ fontSize: '0.9rem' }} />
                                                    </div>
                                                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#333' }}>
                                                        {t.language === 'ar' ? 'إعداد الأوامر التفاعلية' : 'Smart Command Setup'}
                                                    </h3>
                                                </div>
                                                
                                                <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '20px', lineHeight: '1.5' }}>
                                                    {t.language === 'ar' ? 'قم ببناء تجربة تفاعلية لعملائك عبر واتساب.' : 'Build an interactive experience for your customers via WhatsApp.'}
                                                </p>

                                                {/* Saved commands list */}
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                                                    {whatsappData.commands.map((cmd, idx) => (
                                                        <div key={idx} style={{ position: 'relative', background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #e8e8e8' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                                <span style={{ fontWeight: 800, color: '#25d366', fontSize: '0.9rem' }}>/{cmd.command}</span>
                                                                <span style={{ fontSize: '0.65rem', background: '#f0f0f0', padding: '1px 6px', borderRadius: '8px', color: '#888' }}>{cmd.type}</span>
                                                            </div>
                                                            <button type="button" onClick={() => removeCommand(idx, 'whatsapp')} style={{ position: 'absolute', top: '10px', right: '10px', color: '#ff4d4f', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                                <i className="fas fa-trash" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* New command builder */}
                                                <div style={{ background: '#fbfcfe', border: '1px solid #e6ebf5', borderRadius: '15px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                                                        <input type="text" placeholder="command" value={newCommand.command} onChange={e => updateNewCommand('command', e.target.value)}
                                                            style={{ borderRadius: '8px', padding: '8px 12px', border: '1px solid #ddd' }} />
                                                        <select value={newCommand.type} onChange={e => updateNewCommand('type', e.target.value)}
                                                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                                                            <option value="ai">🤖 AI Reply</option>
                                                            <option value="fixed_message">💬 Fixed Message</option>
                                                            <option value="product_menu">🛍️ Product Menu</option>
                                                        </select>
                                                    </div>
                                                    <button type="button" onClick={addCommand}
                                                        style={{ width: '100%', padding: '10px', background: '#25d366', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}>
                                                        {t.language === 'ar' ? 'إضافة الأمر' : 'Add Command'}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="card-actions" style={{ marginTop: '25px', padding: '15px 0 0 0', borderTop: '1px solid #f0f0f0' }}>
                                                <button type="submit" className="btn btn-primary" style={{ background: '#25d366', borderColor: '#25d366', width: '100%' }}>
                                                    {isWhatsappEditing ? (t.language === 'ar' ? 'تحديث الإعدادات' : 'Update Settings') : (t.language === 'ar' ? 'تفعيل وتوصيل' : 'Activate & Connect')}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}

                        {/* Telegram View */}
                        {selectedPlatform === 'telegram' && (
                            <div className="detail-card" style={{ background: '#fff', borderRadius: '15px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <i className="fab fa-telegram" style={{ color: '#26A5E4' }} />
                                    {t.language === 'ar' ? 'إعداد تليجرام' : 'Telegram Setup'}
                                </h2>
                                <form onSubmit={handleTelegramSubmit} style={{ marginTop: '20px' }}>
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
                                            
                                            <button type="button" onClick={() => removeCommand(idx, 'telegram')} style={{ position: 'absolute', top: '12px', right: '12px', color: '#ff4d4f', background: '#fff', border: '1px solid #ff4d4f30', cursor: 'pointer', width: '24px', height: '24px', borderRadius: '50%', fontSize: '0.7rem' }}>
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
                                                <i className="fas fa-boxes" /> {t.language === 'ar' ? 'قائمة المنتجات (3 على الأقل)' : 'Products List (Min 3)'}
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

                                        <button type="button" onClick={addCommand}
                                            style={{ width: '100%', padding: '12px', background: '#26A5E4', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(38, 165, 228, 0.2)' }}>
                                            <i className="fas fa-check-circle" />
                                            {t.language === 'ar' ? 'إضافة الأمر' : 'Add Command'}
                                        </button>
                                    </div>
                                </div>

                                <div className="card-actions" style={{ marginTop: '30px', padding: '15px 0 0 0', borderTop: '1px solid #f0f0f0' }}>
                                    <button type="submit" className="btn btn-primary" style={{ background: '#26A5E4', borderColor: '#26A5E4', width: '100%' }}>
                                        {isTelegramEditing ? (t.language === 'ar' ? 'تحديث الإعدادات' : 'Update Settings') : (t.dashboard.integrationsPage.whatsappSave || 'Save & Connect')}
                                    </button>
                                </div>
                            </form>
                        </div>
                        )}

                        {/* Instagram View */}
                        {selectedPlatform === 'instagram' && (
                            <div className="detail-card" style={{ background: '#fff', borderRadius: '15px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <i className="fab fa-instagram" style={{ color: '#e4405f' }} />
                                    {t.language === 'ar' ? 'قواعد إنستجرام للردود التلقائية' : 'Instagram Auto-Reply Rules'}
                                </h2>
                                
                                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '20px', lineHeight: '1.5' }}>
                                    {t.language === 'ar' ? 'استخدم هذه الأداة للرد التلقائي (بالرسائل الخاصة DM) على المستخدمين الذين يقومون بالتعليق على منشوراتك بكلمات محددة.' : 'Set up auto direct messages when users comment specific words on your posts or reels.'}
                                </p>

                                <form onSubmit={handleInstagramSubmit} style={{ marginTop: '20px' }}>
                                    
                                    <div className="form-group" style={{ marginBottom: '25px' }}>
                                        <label>{t.language === 'ar' ? 'Page Access Token (من فيسبوك)' : 'Page Access Token (from Facebook)'}</label>
                                        
                                        {isInstagramEditing && !isInstagramTokenRevealed ? (
                                            <div style={{ marginTop: '10px', padding: '15px', background: '#f8fbfc', borderRadius: '12px', border: '1px solid #e8e8e8' }}>
                                                {!revealOtpVisible ? (
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-outline"
                                                        onClick={requestRevealOtp}
                                                        disabled={isRequestingOtp}
                                                        style={{ width: '100%', height: '40px', borderStyle: 'dashed', fontSize: '0.85rem' }}
                                                    >
                                                        {isRequestingOtp ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-eye" style={{ marginInlineEnd: '8px' }} />}
                                                        {t.language === 'ar' ? 'كشف الـ Token (يتطلب OTP)' : 'Reveal Token (Requires OTP)'}
                                                    </button>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <input
                                                            type="text"
                                                            placeholder={t.language === 'ar' ? 'رمز الـ OTP' : 'OTP Code'}
                                                            value={revealOtpCode}
                                                            onChange={(e) => setRevealOtpCode(e.target.value)}
                                                            style={{ flex: 1, borderRadius: '10px', padding: '8px 12px', border: '1px solid #e4405f', fontSize: '0.85rem' }}
                                                        />
                                                        <button 
                                                            type="button" 
                                                            className="btn btn-primary"
                                                            onClick={verifyRevealOtp}
                                                            disabled={isVerifyingRevealOtp}
                                                            style={{ background: '#e4405f', borderColor: '#e4405f', padding: '0 15px', fontSize: '0.85rem' }}
                                                        >
                                                            {isVerifyingRevealOtp ? <i className="fas fa-spinner fa-spin" /> : (t.language === 'ar' ? 'تأكيد' : 'Verify')}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <textarea
                                                required
                                                rows="2"
                                                placeholder="EAAG...."
                                                value={instagramData.pageToken}
                                                onChange={(e) => setInstagramData(prev => ({ ...prev, pageToken: e.target.value }))}
                                                style={{ width: '100%', borderRadius: '12px', padding: '12px 15px', border: '1px solid #ddd', fontSize: '0.85rem' }}
                                            />
                                        )}
                                        <small style={{ color: '#888', display: 'block', marginTop: '5px' }}>
                                            {t.language === 'ar' ? 'ستجده في Facebook Developer Dashboard لبدء استلام تعليقاتك.' : 'Find this in your Facebook Developer Dashboard to enable DM replies.'}
                                        </small>
                                    </div>

                                    <div style={{ borderTop: '2px solid #f0f0f0', paddingTop: '15px' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#333', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <i className="fas fa-bolt" style={{ color: '#e4405f' }} />
                                            {t.language === 'ar' ? 'قواعد الأوامر التفاعلية' : 'Interactive Rule Setup'}
                                        </h3>
                                    </div>
                            {/* Saved rules list */}
                            {instagramData.commentRules.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#333' }}>{t.language === 'ar' ? 'القواعد المحفوظة:' : 'Saved Rules:'}</h4>
                                    {instagramData.commentRules.map((rule, idx) => (
                                        <div key={idx} style={{ position: 'relative', background: '#f8fbfc', padding: '15px', borderRadius: '12px', border: '1px solid #e8e8e8' }}>
                                            <div style={{ color: '#e4405f', fontWeight: 'bold', marginBottom: '5px', fontSize: '0.9rem' }}>
                                                {t.language === 'ar' ? 'الكلمة المفتاحية:' : 'Trigger Word:'} {rule.triggerWord}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#555', whiteSpace: 'pre-line' }}>
                                                {rule.replyMessage}
                                            </div>
                                            
                                            <button type="button" onClick={() => removeIgRule(idx)} style={{ position: 'absolute', top: '15px', right: '15px', color: '#ff4d4f', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
                                                <i className="fas fa-trash" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* New rule builder */}
                            <div style={{ background: '#fff', border: '2px dashed #e4405f40', borderRadius: '15px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: '600' }}>{t.language === 'ar' ? 'الكلمة المفتاحية (مثال: التفاصيل)' : 'Trigger Word (e.g. details)'}</label>
                                    <input type="text" placeholder={t.language === 'ar' ? 'أدخل الكلمة' : 'Enter word'} value={newCommentRule.triggerWord}
                                        onChange={e => setNewCommentRule(prev => ({ ...prev, triggerWord: e.target.value }))}
                                        style={{ borderRadius: '10px', padding: '10px 14px', border: '1px solid #ddd' }} />
                                </div>
                                
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: '600' }}>{t.language === 'ar' ? 'رسالة الرد الخاص (DM)' : 'DM Reply Message'}</label>
                                    <textarea rows="3" value={newCommentRule.replyMessage}
                                        placeholder={t.language === 'ar' ? 'مرحباً، تم إرسال التفاصيل لك...' : 'Hello, here are the details...'}
                                        onChange={e => setNewCommentRule(prev => ({ ...prev, replyMessage: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.85rem' }} />
                                </div>
                                
                                <button type="button" onClick={addIgRule}
                                    style={{ padding: '10px', background: '#e4405f15', color: '#e4405f', border: '1px solid #e4405f40', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem' }}>
                                    <i className="fas fa-plus" style={{ marginInlineEnd: '5px' }} />
                                    {t.language === 'ar' ? 'إضافة القاعدة' : 'Add Rule'}
                                </button>
                            </div>

                                <div className="card-actions" style={{ marginTop: '30px', padding: '15px 0 0 0', borderTop: '1px solid #f0f0f0' }}>
                                    <button type="submit" className="btn btn-primary" style={{ background: '#e4405f', borderColor: '#e4405f', width: '100%' }}>
                                        {t.language === 'ar' ? 'حفظ وتفعيل' : 'Save & Enable'}
                                    </button>
                                </div>
                            </form>
                        </div>
                        )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Integrations;
