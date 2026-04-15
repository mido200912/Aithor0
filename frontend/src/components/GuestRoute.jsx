import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * A wrapper for public routes that should NOT be accessible to logged-in users
 * (like Login and Register pages).
 */
const GuestRoute = ({ children }) => {
    const { user, loading, isAuthChecked } = useAuth();

    // Still checking auth state
    if (!isAuthChecked || loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
                <div style={{ color: 'var(--primary-color)', fontSize: '1.5rem' }}>Loading...</div>
            </div>
        );
    }

    // If user is logged in, redirect to dashboard
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default GuestRoute;
