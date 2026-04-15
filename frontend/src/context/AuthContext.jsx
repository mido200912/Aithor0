import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { secureStorage } from '../utils/secureStorage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Start with true to check auth on mount
    const [error, setError] = useState(null);
    const [isAuthChecked, setIsAuthChecked] = useState(false);

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://aithor1.vercel.app/api';

    // Check if user is already logged in on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = secureStorage.getItem('token');
            const savedUser = secureStorage.getItem('user');

            if (token && savedUser) {
                try {
                    // Set axios header
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                    // Parse saved user
                    setUser(savedUser);

                    // Optionally validate token with backend
                    // const response = await axios.get(`${BACKEND_URL}/auth/me`);
                    // setUser(response.data.user);
                } catch (err) {
                    console.error('Auth initialization error:', err);
                    // Token invalid, clear storage
                    secureStorage.removeItem('token');
                    secureStorage.removeItem('user');
                    delete axios.defaults.headers.common['Authorization'];
                }
            }
            setLoading(false);
            setIsAuthChecked(true);
        };

        initAuth();
    }, []);

    const login = async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${BACKEND_URL}/auth/login`, { email, password });
            
            // Check if backend requests OTP
            if (response.data.step === 'otp_required') {
                return { step: 'otp_required', email: response.data.email };
            }

            // Fallback for direct login (if no OTP configured / older flow)
            const { user, token } = response.data;
            setUser(user);
            secureStorage.setItem('token', token);
            secureStorage.setItem('user', user);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            return { step: 'done' };
        } catch (err) {
            console.error('Login Error:', err);
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setError(msg);

            if (err.message === "Network Error") {
                setError("لا يمكن الاتصال بالخادم. تأكد من تشغيل الباك اند في terminal اخر.");
            }
            return { step: 'error' };
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async (email, otp) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${BACKEND_URL}/auth/verify-otp`, { email, otp });
            const { user, token } = response.data;

            setUser(user);
            secureStorage.setItem('token', token);
            secureStorage.setItem('user', user);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            return true;
        } catch (err) {
            console.error('OTP Verify Error:', err);
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setError(msg);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const register = async (name, email, password) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${BACKEND_URL}/auth/register`, { name, email, password });
            if (response.data.step === 'otp_required') {
                return { step: 'otp_required', email: response.data.email };
            }

            const { user, token } = response.data;
            setUser(user);
            secureStorage.setItem('token', token);
            secureStorage.setItem('user', user);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            return { step: 'done' };
        } catch (err) {
            console.error('Register Error:', err);
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setError(msg);

            if (err.message === "Network Error") {
                setError("لا يمكن الاتصال بالخادم. تأكد من تشغيل الباك اند في terminal اخر.");
            }
            return { step: 'error' };
        } finally {
            setLoading(false);
        }
    };

    const forgotPassword = async (email) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${BACKEND_URL}/auth/forgot-password`, { email });
            return response.data; // e.g. { step: "otp_required", email }
        } catch (err) {
            console.error('Forgot Password Error:', err);
            setError(err.response?.data?.error || err.response?.data?.message || err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async (email, otp, newPassword) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${BACKEND_URL}/auth/reset-password`, { email, otp, newPassword });
            return response.data;
        } catch (err) {
            console.error('Reset Password Error:', err);
            setError(err.response?.data?.error || err.response?.data?.message || err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const changePassword = async (oldPassword, newPassword) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${BACKEND_URL}/auth/change-password`, { oldPassword, newPassword });
            return true;
        } catch (err) {
            console.error('Change Password Error:', err);
            setError(err.response?.data?.error || err.response?.data?.message || err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const googleLogin = async (idToken) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${BACKEND_URL}/auth/google-login`, { idToken });
            const { user, token, isNew } = response.data;
            setUser(user);
            secureStorage.setItem('token', token);
            secureStorage.setItem('user', user);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            return { success: true, isNew };
        } catch (err) {
            console.error('Google Login Error:', err);
            setError(err.response?.data?.error || "Google authentication failed");
            return { success: false };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        secureStorage.removeItem('token');
        secureStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ 
            user, loading, error, setError,
            login, verifyOtp, register, logout, isAuthChecked,
            forgotPassword, resetPassword, changePassword,
            googleLogin
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

