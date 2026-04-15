import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { secureStorage } from '../../utils/secureStorage';
import { motion } from 'framer-motion';
import './Settings.css';

const Settings = () => {
    const { user, changePassword } = useAuth();
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pwdSaving, setPwdSaving] = useState(false);

    // Password Change State
    const [pwdData, setPwdData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [pwdError, setPwdError] = useState('');

    // API Key State
    const [apiKey, setApiKey] = useState('');
    const [chatToken, setChatToken] = useState('');
    const [copySuccess, setCopySuccess] = useState('');

    // Company Data State
    const [companyData, setCompanyData] = useState({
        name: '',
        industry: '',
        companySize: '',
        description: '',
        vision: '',
        mission: '',
        values: '', // Handle as comma separated string for UI
        websiteUrl: '',
        allowedDomains: '' // Handle as comma separated string for UI
    });

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://aithor1.vercel.app/api';
    const token = secureStorage.getItem('token');

    const fetchCompanyData = useCallback(async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/company`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data;
            setCompanyData({
                name: data.name || user?.name || '',
                industry: data.industry || '',
                companySize: data.size || '',
                description: data.description || '',
                vision: data.vision || '',
                mission: data.mission || '',
                values: data.values ? data.values.join(', ') : '',
                websiteUrl: data.websiteUrl || '',
                allowedDomains: data.allowedDomains ? data.allowedDomains.join(', ') : ''
            });
        } catch (error) {
            console.error("Error fetching company data", error);
        } finally {
            setLoading(false);
        }
    }, [BACKEND_URL, token, user?.name]);

    const fetchApiKey = useCallback(async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/company/apikey`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setApiKey(res.data.apiKey);
        } catch (error) {
            console.error("Error fetching API Key", error);
        }
    }, [BACKEND_URL, token]);

    const fetchChatToken = useCallback(async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/company`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setChatToken(res.data.chatToken);
        } catch (error) {
            console.error("Error fetching Chat Token", error);
        }
    }, [BACKEND_URL, token]);

    useEffect(() => {
        fetchCompanyData();
        fetchApiKey();
        fetchChatToken();
    }, [fetchCompanyData, fetchApiKey, fetchChatToken]);



    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopySuccess(t.dashboard.settingsPage.copiedText);
        setTimeout(() => setCopySuccess(''), 2000);
    };

    const handleInputChange = (e) => {
        setCompanyData({ ...companyData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Convert values string back to array
            const payload = {
                ...companyData,
                values: companyData.values.split(',').map(v => v.trim()).filter(v => v),
                allowedDomains: companyData.allowedDomains.split(',').map(d => d.trim()).filter(d => d),
                size: companyData.companySize
            };

            await axios.post(`${BACKEND_URL}/company`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert(`✅ ${t.dashboard.settingsPage.saveSuccess}`);
        } catch (error) {
            console.error("Error updating settings:", error);
            alert(`❌ ${t.dashboard.settingsPage.saveError}`);
        } finally {
            setSaving(false);
        }
    };

    const handlePwdChange = (e) => {
        setPwdData({ ...pwdData, [e.target.name]: e.target.value });
        setPwdError('');
    };

    const handleSavePassword = async () => {
        if (!pwdData.oldPassword || !pwdData.newPassword) return setPwdError('All fields are required');
        if (pwdData.newPassword.length < 8) return setPwdError('New password must be at least 8 chars');
        if (pwdData.newPassword !== pwdData.confirmPassword) return setPwdError('New passwords do not match');

        setPwdSaving(true);
        const success = await changePassword(pwdData.oldPassword, pwdData.newPassword);
        if (success) {
            alert('✅ Password changed successfully');
            setPwdData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } else {
            alert('❌ Failed to change password. Check your old password.');
        }
        setPwdSaving(false);
    };

    if (loading) return <div className="loading-state">{t.dashboard.settingsPage.loading}</div>;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="settings-page animate-fade-in">
            <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="page-title"
            >
                {t.dashboard.settingsPage.title}
            </motion.h1>

            <motion.div
                className="settings-grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* General Settings */}
                <motion.div variants={itemVariants} className="card full-width">
                    <div className="card-header">
                        <i className="fas fa-building"></i>
                        <h3>{t.dashboard.settingsPage.orgData}</h3>
                    </div>
                    <div className="card-body">
                        <div className="form-row">
                            <div className="form-group half">
                                <label>{t.dashboard.settingsPage.companyName}</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={companyData.name}
                                    onChange={handleInputChange}
                                    className="settings-input"
                                    placeholder={t.dashboard.settingsPage.companyNameHint}
                                />
                            </div>
                            <div className="form-group half">
                                <label>{t.dashboard.settingsPage.industry}</label>
                                <input
                                    type="text"
                                    name="industry"
                                    value={companyData.industry}
                                    onChange={handleInputChange}
                                    className="settings-input"
                                    placeholder={t.dashboard.settingsPage.industryHint}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t.dashboard.settingsPage.description}</label>
                            <textarea
                                name="description"
                                value={companyData.description}
                                onChange={handleInputChange}
                                className="settings-input"
                                rows="3"
                                placeholder={t.dashboard.settingsPage.descriptionHint}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group half">
                                <label>{t.dashboard.settingsPage.vision}</label>
                                <textarea
                                    name="vision"
                                    value={companyData.vision}
                                    onChange={handleInputChange}
                                    className="settings-input"
                                    rows="2"
                                    placeholder={t.dashboard.settingsPage.visionHint}
                                />
                            </div>
                            <div className="form-group half">
                                <label>{t.dashboard.settingsPage.mission}</label>
                                <textarea
                                    name="mission"
                                    value={companyData.mission}
                                    onChange={handleInputChange}
                                    className="settings-input"
                                    rows="2"
                                    placeholder={t.dashboard.settingsPage.missionHint}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t.dashboard.settingsPage.values}</label>
                            <input
                                type="text"
                                name="values"
                                value={companyData.values}
                                onChange={handleInputChange}
                                className="settings-input"
                                placeholder={t.dashboard.settingsPage.valuesHint}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group half">
                                <label>{language === 'ar' ? 'رابط الموقع (Website URL)' : 'Website URL'}</label>
                                <input
                                    type="text"
                                    name="websiteUrl"
                                    value={companyData.websiteUrl}
                                    onChange={handleInputChange}
                                    className="settings-input"
                                    placeholder="https://example.com"
                                />
                            </div>
                            <div className="form-group half">
                                <label>{language === 'ar' ? 'النطاقات المسموح بها (Allowed Domains)' : 'Allowed Domains'}</label>
                                <input
                                    type="text"
                                    name="allowedDomains"
                                    value={companyData.allowedDomains}
                                    onChange={handleInputChange}
                                    className="settings-input"
                                    placeholder="example.com, shop.example.com"
                                />
                            </div>
                        </div>
                        <p style={{fontSize: '12px', opacity: 0.6, marginBottom: '20px'}}>
                            {language === 'ar' 
                                ? '⚠️ تأمين الـ API: أدخل النطاقات التي سيتم تشغيل البوت عليها فقط لمنع استخدامه في مواقع أخرى.' 
                                : '⚠️ API Security: Enter specific domains where your bot is allowed to run to prevent unauthorized use.'}
                        </p>

                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? t.dashboard.settingsPage.saving : t.dashboard.settingsPage.saveChanges}
                        </button>
                    </div>
                </motion.div>

                {/* API Key Section */}
                <motion.div variants={itemVariants} className="card full-width">
                    <div className="card-header">
                        <i className="fas fa-key"></i>
                        <h3>{t.dashboard.settingsPage.apiKeyTitle}</h3>
                    </div>
                    <div className="card-body">
                        <p className="instruction-tip">
                            {language === 'ar' 
                                ? 'مفاتيح الربط الخاصة بك. استخدم الـ Chat Token لموقعك الإلكتروني لأمان أعلى.' 
                                : 'Your API keys. Use the Chat Token for your website for higher security.'}
                        </p>
                        
                        <div className="api-keys-container" style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                            <div className="api-key-item">
                                <label style={{fontSize:'13px', fontWeight:'600', marginBottom:'5px', display:'block'}}>
                                    {language === 'ar' ? 'مفتاح الشات (Chat Token) - آمن للمتصفح' : 'Chat Token - Browser Safe'}
                                </label>
                                <div className="api-key-box">
                                    <input type="text" value={chatToken || "Generating..."} readOnly />
                                    <button className="icon-btn" onClick={() => copyToClipboard(chatToken)} title={t.dashboard.settingsPage.copy}>
                                        <i className={`fas ${copySuccess ? 'fa-check' : 'fa-copy'}`}></i>
                                    </button>
                                </div>
                            </div>

                            <div className="api-key-item">
                                <label style={{fontSize:'13px', fontWeight:'600', marginBottom:'5px', display:'block', color: '#ff4444'}}>
                                    {language === 'ar' ? 'مفتاح الإدارة (Secret API Key) - لا تشاركه أبداً' : 'Secret API Key - Never Share'}
                                </label>
                                <div className="api-key-box">
                                    <input type="text" value={apiKey} readOnly />
                                    <button className="icon-btn" onClick={() => copyToClipboard(apiKey)} title={t.dashboard.settingsPage.copy}>
                                        <i className={`fas ${copySuccess ? 'fa-check' : 'fa-copy'}`}></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {copySuccess && <span className="copy-feedback" style={{marginTop:'10px', display:'block'}}>{copySuccess}</span>}

                        <div className="warning-box" style={{marginTop:'20px'}}>
                            <i className="fas fa-exclamation-triangle"></i>
                            <p>
                                {language === 'ar' 
                                    ? 'تنبيه: لا تستخدم الـ Secret API Key داخل كود الجافا سكريبت في موقعك، استخدم دائماً الـ Chat Token.' 
                                    : 'Warning: Never use your Secret API Key inside your website\'s JavaScript code. Always use the Chat Token instead.'}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Change Password Section */}
                <motion.div variants={itemVariants} className="card full-width">
                    <div className="card-header">
                        <i className="fas fa-lock"></i>
                        <h3>Change Password</h3>
                    </div>
                    <div className="card-body">
                        {pwdError && <p style={{color: 'red', marginBottom: '10px'}}>{pwdError}</p>}
                        
                        <div className="form-group">
                            <label>Current Password</label>
                            <input
                                type="password"
                                name="oldPassword"
                                value={pwdData.oldPassword}
                                onChange={handlePwdChange}
                                className="settings-input"
                                placeholder="Enter your current password"
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group half">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={pwdData.newPassword}
                                    onChange={handlePwdChange}
                                    className="settings-input"
                                    placeholder="Enter new password"
                                />
                            </div>
                            <div className="form-group half">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={pwdData.confirmPassword}
                                    onChange={handlePwdChange}
                                    className="settings-input"
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={handleSavePassword}
                            disabled={pwdSaving}
                        >
                            {pwdSaving ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default Settings;
