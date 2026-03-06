import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

const Register = () => {
    const { t } = useLanguage();
    const { register, loading, error } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
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

    const validate = () => {
        const newErrors = {};
        if (!formData.name) newErrors.name = t.auth.errors.required;

        if (!formData.email) newErrors.email = t.auth.errors.required;
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = t.auth.errors.email;

        if (!formData.password) newErrors.password = t.auth.errors.required;
        else if (formData.password.length < 8) newErrors.password = t.auth.errors.passwordLength;

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = t.auth.errors.passwordMatch;
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const success = await register(formData.name, formData.email, formData.password);
        if (success) {
            navigate('/onboarding/profile'); // Navigate to onboarding after register
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card animate-fade-in">
                <div className="auth-header">
                    <h2>{t.auth.registerTitle}</h2>
                    <p>{t.auth.createAccountDesc}</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
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
                </form>

                <div className="auth-footer">
                    <p>
                        {t.auth.haveAccount} <Link to="/login">{t.auth.loginLink}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
