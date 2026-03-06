import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Start with true to check auth on mount
    const [error, setError] = useState(null);
    const [isAuthChecked, setIsAuthChecked] = useState(false);

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // Check if user is already logged in on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');

            if (token && savedUser) {
                try {
                    // Set axios header
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                    // Parse saved user
                    const parsedUser = JSON.parse(savedUser);
                    setUser(parsedUser);

                    // Optionally validate token with backend
                    // const response = await axios.get(`${BACKEND_URL}/auth/me`);
                    // setUser(response.data.user);
                } catch (err) {
                    console.error('Auth initialization error:', err);
                    // Token invalid, clear storage
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
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
            const { user, token } = response.data;

            setUser(user);
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user)); // ✨ Save user to localStorage
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            return true;
        } catch (err) {
            console.error('Login Error:', err);
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setError(msg);

            if (err.message === "Network Error") {
                setError("لا يمكن الاتصال بالخادم. تأكد من تشغيل الباك اند في terminal اخر.");
            }
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
            const { user, token } = response.data;

            setUser(user);
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user)); // ✨ Save user to localStorage
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            return true;
        } catch (err) {
            console.error('Register Error:', err);
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setError(msg);

            if (err.message === "Network Error") {
                setError("لا يمكن الاتصال بالخادم. تأكد من تشغيل الباك اند في terminal اخر.");
            }
            return false;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user'); // ✨ Remove user from localStorage
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, login, register, logout, isAuthChecked }}>
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
