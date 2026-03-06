import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './Settings.css';

const Settings = () => {
    const { user } = useAuth();
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

    useEffect(() => {
        fetchCompanyData();
        fetchApiKey();
    }, []);

    const fetchCompanyData = async () => {
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
    };

    const fetchApiKey = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/company/apikey`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setApiKey(res.data.apiKey);
        } catch (error) {
            console.error("Error fetching API Key", error);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(apiKey);
        setCopySuccess('تم النسخ!');
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

            alert('✅ تم تحديث بيانات الشركة بنجاح!');
        } catch (error) {
            console.error("Error updating settings:", error);
            alert('❌ حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-state">جاري تحميل الإعدادات...</div>;

    return (
        <div className="settings-page animate-fade-in">
            <h1 className="page-title">إعدادات الشركة</h1>

            <div className="settings-grid">
                {/* General Settings */}
                <div className="card full-width">
                    <div className="card-header">
                        <i className="fas fa-building"></i>
                        <h3>بيانات المؤسسة</h3>
                    </div>
                    <div className="card-body">
                        <div className="form-row">
                            <div className="form-group half">
                                <label>اسم الشركة</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={companyData.name}
                                    onChange={handleInputChange}
                                    className="settings-input"
                                    placeholder="اسم شركتك"
                                />
                            </div>
                            <div className="form-group half">
                                <label>مجال العمل (Industry)</label>
                                <input
                                    type="text"
                                    name="industry"
                                    value={companyData.industry}
                                    onChange={handleInputChange}
                                    className="settings-input"
                                    placeholder="مثال: تكنولوجيا، تعليم، تجارة..."
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>وصف الشركة</label>
                            <textarea
                                name="description"
                                value={companyData.description}
                                onChange={handleInputChange}
                                className="settings-input"
                                rows="3"
                                placeholder="وصف قصير عن نشاط الشركة وما تقدمه..."
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group half">
                                <label>الرؤية (Vision)</label>
                                <textarea
                                    name="vision"
                                    value={companyData.vision}
                                    onChange={handleInputChange}
                                    className="settings-input"
                                    rows="2"
                                    placeholder="إلى ماذا تطمح الشركة في المستقبل؟"
                                />
                            </div>
                            <div className="form-group half">
                                <label>الرسالة (Mission)</label>
                                <textarea
                                    name="mission"
                                    value={companyData.mission}
                                    onChange={handleInputChange}
                                    className="settings-input"
                                    rows="2"
                                    placeholder="ما هي مهمة الشركة اليومية؟"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>قيم الشركة (Values) - افصل بينها بفاصلة</label>
                            <input
                                type="text"
                                name="values"
                                value={companyData.values}
                                onChange={handleInputChange}
                                className="settings-input"
                                placeholder="مثال: الشفافية، الابتكار، الجودة"
                            />
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                        </button>
                    </div>
                </div>

                {/* API Key Section */}
                <div className="card full-width">
                    <div className="card-header">
                        <i className="fas fa-key"></i>
                        <h3>مفتاح الربط (API Key)</h3>
                    </div>
                    <div className="card-body">
                        <p className="instruction-tip">استخدم هذا المفتاح لربط أنظمتك الخارجية بـ Aithor.</p>
                        <div className="api-key-box">
                            <input type="text" value={apiKey} readOnly />
                            <button className="icon-btn" onClick={copyToClipboard} title="نسخ">
                                <i className={`fas ${copySuccess ? 'fa-check' : 'fa-copy'}`}></i>
                            </button>
                        </div>
                        {copySuccess && <span className="copy-feedback">{copySuccess}</span>}

                        <div className="warning-box">
                            <i className="fas fa-exclamation-triangle"></i>
                            <p>هذا المفتاح سري للغاية. يتيح الوصول لخدمات الذكاء الاصطناعي باسم شركتك.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
