import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

const Login = () => {
    const { t } = useLanguage();
    const { login, verifyOtp, googleLogin, loading, error } = useAuth();
    const navigate = useNavigate();

    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // Initialize Google Login
    useEffect(() => {
        if (GOOGLE_CLIENT_ID && !window.googleInitStarted) {
            window.googleInitStarted = true;
            const script = document.createElement('script');
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);

            script.onload = () => {
                window.google?.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse
                });

                // Render the button explicitly
                const buttonParent = document.getElementById('google-login-btn');
                if (buttonParent) {
                    window.google?.accounts.id.renderButton(
                        buttonParent,
                        { theme: "outline", size: "large", width: 320, shape: "rectangular" }
                    );
                }
            };
        }
    }, []);

    const handleGoogleResponse = async (response) => {
        const success = await googleLogin(response.credential);
        if (success) navigate('/dashboard');
    };

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        otp: ''
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        if (errors[e.target.name]) {
            setErrors({
                ...errors,
                [e.target.name]: null
            });
        }
    };

    const validateStep1 = () => {
        const newErrors = {};
        const emailTrimmed = formData.email?.trim() || '';

        if (!emailTrimmed) newErrors.email = t.auth.errors.required;
        else if (!/^\S+@\S+\.\S+$/.test(emailTrimmed)) newErrors.email = t.auth.errors.email;

        if (!formData.password) newErrors.password = t.auth.errors.required;
        return newErrors;
    };

    const validateStep2 = () => {
        const newErrors = {};
        if (!formData.otp) newErrors.otp = t.auth.errors.required;
        else if (formData.otp.length < 6) newErrors.otp = "OTP must be at least 6 digits";
        return newErrors;
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validateStep1();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const emailTrimmed = formData.email?.trim() || '';
        const result = await login(emailTrimmed, formData.password);
        if (result?.step === 'otp_required') {
            setStep(2);
        } else if (result?.step === 'done') {
            navigate('/dashboard');
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validateStep2();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const emailTrimmed = formData.email?.trim() || '';
        const success = await verifyOtp(emailTrimmed, formData.otp);
        if (success) {
            navigate('/dashboard');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card animate-fade-in">
                <div className="auth-header">
                    <h2>{step === 1 ? t.auth.welcomeBack : "Verification Required"}</h2>
                    <p>{step === 1 ? t.auth.loginTitle : "Please check your email for the OTP code."}</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                {step === 1 ? (
                    <form onSubmit={handleLoginSubmit}>
                        <Input
                            label={t.auth.emailLabel}
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            error={errors.email}
                            required
                        />
                        <Input
                            label={t.auth.passwordLabel}
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            error={errors.password}
                            required
                        />

                        <div className="form-actions">
                            <Link to="/forgot-password" className="forgot-password">
                                {t.auth.forgotPassword}
                            </Link>
                        </div>

                        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                            {loading ? '...' : t.auth.loginButton}
                        </button>

                        <div className="social-divider">
                            <span>{t.language === 'ar' ? 'أو سجل بواسطة' : 'Or continue with'}</span>
                        </div>

                        <div className="social-login-buttons">
                            {/* Google Button Parent Container */}
                            <div id="google-login-btn" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}></div>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleOtpSubmit}>
                        <Input
                            label="OTP Code from Email"
                            type="text"
                            name="otp"
                            value={formData.otp}
                            onChange={handleChange}
                            error={errors.otp}
                            required
                        />

                        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-outline btn-block" 
                            style={{marginTop: "10px"}}
                            onClick={() => setStep(1)}
                            disabled={loading}>
                            Back to Login
                        </button>
                    </form>
                )}

                {step === 1 && (
                    <div className="auth-footer">
                        <p>
                            {t.auth.noAccount} <Link to="/register">{t.auth.registerLink}</Link>
                        </p>
                        <div className="legal-links" style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '15px', fontSize: '0.9rem' }}>
                            <Link to="/terms" style={{ color: 'var(--text-secondary)' }}>{t.footer.terms}</Link>
                            <Link to="/privacy" style={{ color: 'var(--text-secondary)' }}>{t.footer.privacy}</Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
