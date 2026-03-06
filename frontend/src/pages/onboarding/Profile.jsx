import { useState } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import '../../pages/auth/Auth.css';

const OnboardingProfile = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        industry: '',
        description: '',
        vision: '',
        mission: '',
        values: ''
    });

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('token');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Process values string to array logic handled in backend if needed or send as array
            // Here backend expects array for values, let's keep it simple string for now or split
            const payload = {
                ...formData,
                values: formData.values.split(',').map(v => v.trim()).filter(v => v)
            };

            await axios.post(`${BACKEND_URL}/company`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Navigate to next step
            navigate('/onboarding/knowledge');
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card animate-fade-in" style={{ maxWidth: '800px' }}>
                <div className="auth-header">
                    <h2>إعداد هوية الشركة</h2>
                    <p>هذه البيانات ستشكل شخصية الذكاء الاصطناعي وتساعده في الرد بدقة</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">اسم الشركة <span className="required">*</span></label>
                            <input
                                className="form-input"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="اسم شركتك"
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">مجال العمل <span className="required">*</span></label>
                            <input
                                className="form-input"
                                type="text"
                                name="industry"
                                value={formData.industry}
                                onChange={handleChange}
                                required
                                placeholder="تكنولوجيا، تعليم، تجارة..."
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">وصف الشركة</label>
                        <textarea
                            className="form-input"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="3"
                            placeholder="وصف مختصر لنشاط الشركة وما تقدمه للعملاء..."
                        />
                    </div>

                    <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">الرؤية (Vision)</label>
                            <textarea
                                className="form-input"
                                name="vision"
                                value={formData.vision}
                                onChange={handleChange}
                                rows="2"
                                placeholder="طموحات الشركة المستقبلية"
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">الرسالة (Mission)</label>
                            <textarea
                                className="form-input"
                                name="mission"
                                value={formData.mission}
                                onChange={handleChange}
                                rows="2"
                                placeholder="مهمة الشركة اليومية"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">القيم (Values) - افصل بفاصلة</label>
                        <input
                            className="form-input"
                            type="text"
                            name="values"
                            value={formData.values}
                            onChange={handleChange}
                            placeholder="مثال: الجودة، الأمانة، الابتكار"
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={loading}
                        >
                            {loading ? 'جاري الحفظ...' : 'حفظ ومتابعة (1/2)'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OnboardingProfile;
