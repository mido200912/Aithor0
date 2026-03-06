import { useNavigate } from 'react-router-dom';
import '../../pages/auth/Auth.css';

const OnboardingConnect = () => {
    const navigate = useNavigate();

    const handleConnect = (platform) => {
        // Mock connection logic
        console.log(`Connecting to ${platform}...`);
        alert(`جاري التحويل لربط ${platform}... (محاكاة)`);
    };

    const handleFinish = () => {
        navigate('/dashboard');
    };

    return (
        <div className="auth-container">
            <div className="auth-card animate-fade-in" style={{ maxWidth: '600px' }}>
                <div className="auth-header">
                    <h2>ربط القنوات</h2>
                    <p>اربط منصات التواصل الاجتماعي لبدء استقبال الرسائل</p>
                </div>

                <div className="channels-grid" style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="channel-item" style={{
                        padding: '1rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <i className="fab fa-facebook-messenger" style={{ fontSize: '2rem', color: '#0084FF' }}></i>
                            <div>
                                <h3>Facebook Messenger</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>الرد الآلي على رسائل الصفحة</p>
                            </div>
                        </div>
                        <button className="btn btn-outline" onClick={() => handleConnect('Facebook')}>ربط</button>
                    </div>

                    <div className="channel-item" style={{
                        padding: '1rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <i className="fab fa-whatsapp" style={{ fontSize: '2rem', color: '#25D366' }}></i>
                            <div>
                                <h3>WhatsApp Business</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>بوت واتساب</p>
                            </div>
                        </div>
                        <button className="btn btn-outline" onClick={() => handleConnect('WhatsApp')}>ربط</button>
                    </div>
                </div>

                <button className="btn btn-primary btn-block" onClick={handleFinish}>
                    إنهاء والذهاب للوحة التحكم
                </button>
            </div>
        </div>
    );
};

export default OnboardingConnect;
