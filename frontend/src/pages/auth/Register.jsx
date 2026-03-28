import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

const Register = () => {
    const { t } = useLanguage();
    const { register, verifyOtp, googleLogin, loading, error } = useAuth();
    const navigate = useNavigate();

    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // Initialize Google Login
    useEffect(() => {
        if (GOOGLE_CLIENT_ID) {
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
                const buttonParent = document.getElementById('google-register-btn');
                if (buttonParent) {
                    window.google?.accounts.id.renderButton(
                        buttonParent,
                        { theme: "outline", size: "large", width: 350, shape: "rectangular" }
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
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
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
        const emailTrimmed = formData.email.trim();
        
        if (!formData.name) newErrors.name = t.auth.errors.required;

        if (!emailTrimmed) newErrors.email = t.auth.errors.required;
        else if (!/^\S+@\S+\.\S+$/.test(emailTrimmed)) newErrors.email = t.auth.errors.email;

        if (!formData.password) newErrors.password = t.auth.errors.required;
        else if (formData.password.length < 8) newErrors.password = t.auth.errors.passwordLength;

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = t.auth.errors.passwordMatch;
        }

        return newErrors;
    };

    const validateStep2 = () => {
        const newErrors = {};
        if (!formData.otp) newErrors.otp = t.auth.errors.required;
        else if (formData.otp.length < 6) newErrors.otp = "OTP must be at least 6 digits";
        return newErrors;
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validateStep1();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const emailTrimmed = formData.email.trim();
        const result = await register(formData.name, emailTrimmed, formData.password);
        if (result?.step === 'otp_required') {
            setStep(2);
        } else if (result?.step === 'done') {
            navigate('/onboarding/profile'); // Navigate to onboarding after register
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validateStep2();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const success = await verifyOtp(formData.email, formData.otp);
        if (success) {
            navigate('/onboarding/profile');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card animate-fade-in">
                <div className="auth-header">
                    <h2>{step === 1 ? t.auth.registerTitle : "Account Verification"}</h2>
                    <p>{step === 1 ? t.auth.createAccountDesc : "Please check your email for the confirmation OTP code."}</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                {step === 1 ? (
                    <form onSubmit={handleRegisterSubmit}>
                        <Input
                            label={t.auth.nameLabel}
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            error={errors.name}
                            required
                        />
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
                        <Input
                            label={t.auth.confirmPasswordLabel}
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            error={errors.confirmPassword}
                            required
                        />

                        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                            {loading ? '...' : t.auth.registerButton}
                        </button>

                        <div className="social-divider">
                            <span>{t.language === 'ar' ? 'أو سجل بواسطة' : 'Or continue with'}</span>
                        </div>

                        <div className="social-login-buttons">
                            {/* Google Button Parent Container */}
                            <div id="google-register-btn" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}></div>
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
                            {loading ? 'Verifying...' : 'Verify Email & Create Account'}
                        </button>
                    </form>
                )}

                {step === 1 && (
                    <div className="auth-footer">
                        <p>
                            {t.auth.haveAccount} <Link to="/login">{t.auth.loginLink}</Link>
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

export default Register;
