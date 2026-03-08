import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { motion } from 'framer-motion';
import './Settings.css';

const Settings = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // API Key State
    const [apiKey, setApiKey] = useState('');
    const [copySuccess, setCopySuccess] = useState('');

    // Company Data State
    const [companyData, setCompanyData] = useState({
        name: '',
        industry: '',
        companySize: '',
        description: '',
        vision: '',
        mission: '',
        values: '' // Handle as comma separated string for UI
    });

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('token');

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
                values: data.values ? data.values.join(', ') : ''
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

    useEffect(() => {
        fetchCompanyData();
        fetchApiKey();
    }, [fetchCompanyData, fetchApiKey]);



    const copyToClipboard = () => {
        navigator.clipboard.writeText(apiKey);
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
                        <p className="instruction-tip">{t.dashboard.settingsPage.apiKeyDesc}</p>
                        <div className="api-key-box">
                            <input type="text" value={apiKey} readOnly />
                            <button className="icon-btn" onClick={copyToClipboard} title={t.dashboard.settingsPage.copy}>
                                <i className={`fas ${copySuccess ? 'fa-check' : 'fa-copy'}`}></i>
                            </button>
                        </div>
                        {copySuccess && <span className="copy-feedback">{copySuccess}</span>}

                        <div className="warning-box">
                            <i className="fas fa-exclamation-triangle"></i>
                            <p>{t.dashboard.settingsPage.apiKeyWarning}</p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default Settings;
