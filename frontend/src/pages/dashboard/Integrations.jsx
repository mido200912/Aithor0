import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { motion } from 'framer-motion';
import './Integrations.css';

const Integrations = () => {
    const { t } = useLanguage();
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [availableIntegrations, setAvailableIntegrations] = useState([
        {
            id: 'facebook',
            name: 'Facebook Messenger',
            icon: 'facebook-f',
            color: '#1877f2',
            descKey: 'messengerDesc',
            available: true
        },
        {
            id: 'whatsapp',
            name: 'WhatsApp Business',
            icon: 'whatsapp',
            color: '#25d366',
            descKey: 'whatsappDesc',
            available: true
        },
        {
            id: 'shopify',
            name: 'Shopify',
            icon: 'shopify',
            color: '#96bf48',
            descKey: 'shopifyDesc',
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
            id: 'tiktok',
            name: 'TikTok',
            icon: 'tiktok',
            color: '#000000',
            descKey: 'tiktokDesc',
            available: true
        }
    ]);

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchIntegrations();

        // Check for OAuth callback status
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const platform = urlParams.get('platform');

        if (status && platform) {
            if (status === 'success') {
                alert(`✅ ${t.dashboard.integrationsPage.success} ${platform}!`);
            } else {
                alert(`❌ ${t.dashboard.integrationsPage.failed} ${platform}`);
            }
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            fetchIntegrations(); // Refresh integrations
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
            // Get company ID from local storage or token
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            // For Meta (Facebook/Instagram/WhatsApp)
            if (integration.id === 'facebook' || integration.id === 'whatsapp' || integration.id === 'instagram') {
                // Redirect to Meta OAuth flow
                const companyRes = await axios.get(`${BACKEND_URL}/company`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const companyId = companyRes.data._id;

                window.location.href = `${BACKEND_URL}/integrations/meta/login?companyId=${companyId}`;
            }
            // For TikTok
            else if (integration.id === 'tiktok') {
                const companyRes = await axios.get(`${BACKEND_URL}/company`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const companyId = companyRes.data._id;

                window.location.href = `${BACKEND_URL}/integrations/tiktok/login?companyId=${companyId}`;
            }
            // For Shopify
            else if (integration.id === 'shopify') {
                const shopUrl = prompt(t.dashboard.integrationsPage.shopifyPrompt);
                if (!shopUrl) return;

                const companyRes = await axios.get(`${BACKEND_URL}/company`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const companyId = companyRes.data._id;

                window.location.href = `${BACKEND_URL}/integrations/shopify/login?shop=${shopUrl}&companyId=${companyId}`;
            }
        } catch (error) {
            console.error('Error connecting integration:', error);
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
            fetchIntegrations(); // Refresh
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
            fetchIntegrations(); // Refresh
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

            {loading ? (
                <p style={{ textAlign: 'center', padding: '40px' }}>{t.dashboard.integrationsPage.loading}</p>
            ) : (
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
            )}
        </div>
    );
};

export default Integrations;
