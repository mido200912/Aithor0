import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

const Login = () => {
    const { t } = useLanguage();
    const { login, loading, error } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        // Clear error when user types
        if (errors[e.target.name]) {
            setErrors({
                ...errors,
                [e.target.name]: null
            });
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.email) newErrors.email = t.auth.errors.required;
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = t.auth.errors.email;

        if (!formData.password) newErrors.password = t.auth.errors.required;

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const success = await login(formData.email, formData.password);
        if (success) {
            navigate('/dashboard');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card animate-fade-in">
                <div className="auth-header">
                    <h2>{t.auth.welcomeBack}</h2>
                    <p>{t.auth.loginTitle}</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
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
                </form>

                <div className="auth-footer">
                    <p>
                        {t.auth.noAccount} <Link to="/register">{t.auth.registerLink}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
