import { useState, useEffect } from 'react';
import axios from 'axios';
import './Integrations.css';

const Integrations = () => {
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [availableIntegrations, setAvailableIntegrations] = useState([
        {
            id: 'facebook',
            name: 'Facebook Messenger',
            icon: 'facebook-f',
            color: '#1877f2',
            description: 'الرد التلقائي على رسائل الصفحة',
            available: true
        },
        {
            id: 'whatsapp',
            name: 'WhatsApp Business',
            icon: 'whatsapp',
            color: '#25d366',
            description: 'بوت واتساب لخدمة العملاء',
            available: true
        },
        {
            id: 'shopify',
            name: 'Shopify',
            icon: 'shopify',
            color: '#96bf48',
            description: 'ربط متجرك الإلكتروني',
            available: true
        },
        {
            id: 'instagram',
            name: 'Instagram',
            icon: 'instagram',
            color: '#e4405f',
            description: 'الرد على الرسائل المباشرة',
            available: true
        },
        {
            id: 'tiktok',
            name: 'TikTok',
            icon: 'tiktok',
            color: '#000000',
            description: 'الرد التلقائي على رسائل تيك توك',
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
                alert(`✅ تم ربط ${platform} بنجاح!`);
            } else {
                alert(`❌ فشل ربط ${platform}`);
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
            if (integration.id === 'facebook' || integration.id === 'whatsapp') {
                // Redirect to Meta OAuth flow
                const companyRes = await axios.get(`${BACKEND_URL}/company`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const companyId = companyRes.data._id;

                window.location.href = `${BACKEND_URL}/integrations/meta/login?companyId=${companyId}`;
            }
            // For Shopify
            else if (integration.id === 'shopify') {
                const shopUrl = prompt('أدخل رابط متجرك على Shopify (مثال: mystore.myshopify.com):');
                if (!shopUrl) return;

                const companyRes = await axios.get(`${BACKEND_URL}/company`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const companyId = companyRes.data._id;

                window.location.href = `${BACKEND_URL}/integrations/shopify/login?shop=${shopUrl}&companyId=${companyId}`;
            }
        } catch (error) {
            console.error('Error connecting integration:', error);
            alert('حدث خطأ أثناء الربط');
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
            alert('حدث خطأ');
        }
    };

    const handleDisconnect = async (platformId) => {
        const integration = integrations.find(int => int.platform === platformId);
        if (!integration) return;

        if (!confirm('هل أنت متأكد من إلغاء الربط؟')) return;

        try {
            await axios.delete(`${BACKEND_URL}/integration-manager/${integration.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchIntegrations(); // Refresh
        } catch (error) {
            console.error('Error disconnecting integration:', error);
            alert('حدث خطأ أثناء إلغاء الربط');
        }
    };

    return (
        <div className="integrations-page animate-fade-in">
            <h1 className="page-title">التكاملات</h1>
            <p className="page-subtitle">اربط البوت بقنوات التواصل المفضلة لعملائك</p>

            {loading ? (
                <p style={{ textAlign: 'center', padding: '40px' }}>جاري التحميل...</p>
            ) : (
                <div className="integrations-list">
                    {availableIntegrations.map(integration => {
                        const status = getIntegrationStatus(integration.id);

                        return (
                            <div key={integration.id} className={`integration-item ${status}`}>
                                <div className="integration-icon" style={{ backgroundColor: `${integration.color}15`, color: integration.color }}>
                                    <i className={`fab fa-${integration.icon}`}></i>
                                </div>
                                <div className="integration-info">
                                    <h3>{integration.name}</h3>
                                    <p>{integration.description}</p>
                                </div>
                                <div className="integration-action">
                                    {!integration.available ? (
                                        <span className="badge badge-gray">قريباً</span>
                                    ) : status === 'connected' ? (
                                        <>
                                            <button
                                                className="btn btn-outline"
                                                onClick={() => handleToggle(integration.id)}
                                            >
                                                تعطيل مؤقت
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                style={{ marginRight: '10px' }}
                                                onClick={() => handleDisconnect(integration.id)}
                                            >
                                                إلغاء الربط
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => handleConnect(integration)}
                                        >
                                            اتصال
                                        </button>
                                    )}
                                </div>
                                {status === 'connected' && <div className="status-dot"></div>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Integrations;
