import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { motion } from 'framer-motion';
import './DashboardHome.css';

const DashboardHome = () => {
    const { t } = useLanguage();
    const [stats, setStats] = useState({
        totalConversations: 0,
        activeNow: 0,
        aiResolutionRate: 0,
        recentActivity: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${BACKEND_URL}/company/analytics`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(response.data);
            } catch (err) {
                console.error("Error fetching analytics:", err);
                setError("فشل تحميل البيانات");
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) return <div className="loading-state">{t.dashboard.homePage.loading}</div>;
    // We can show error but might prefer showing zeros or a safe state

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="dashboard-home">
            <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="page-title"
            >
                {t.dashboard.homePage.title}
            </motion.h1>

            <motion.div
                className="stats-grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={itemVariants} className="stat-card">
                    <div className="stat-icon purple">
                        <i className="fas fa-comments"></i>
                    </div>
                    <div>
                        <h3>{t.dashboard.homePage.totalConversations}</h3>
                        <p className="stat-value">{stats.totalConversations}</p>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="stat-card">
                    <div className="stat-icon green">
                        <i className="fas fa-users"></i>
                    </div>
                    <div>
                        <h3>{t.dashboard.homePage.activeNow}</h3>
                        <p className="stat-value">{stats.activeNow}</p>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="stat-card">
                    <div className="stat-icon blue">
                        <i className="fas fa-robot"></i>
                    </div>
                    <div>
                        <h3>{t.dashboard.homePage.aiResolutionRate}</h3>
                        <p className="stat-value">{stats.aiResolutionRate}%</p>
                    </div>
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="recent-activity-section"
            >
                <h3>{t.dashboard.homePage.recentActivity}</h3>
                {stats.recentActivity.length > 0 ? (
                    <div className="activity-list">
                        {stats.recentActivity.map((activity) => (
                            <div key={activity.id} className="activity-item">
                                <div className="activity-icon">
                                    <i className="fas fa-comment-alt"></i>
                                </div>
                                <div className="activity-details">
                                    <h4>{activity.action}</h4>
                                    <p>{activity.details}</p>
                                </div>
                                <span className="activity-time">
                                    {new Date(activity.time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-activity">{t.dashboard.homePage.noActivity}</p>
                )}
            </motion.div>
        </div>
    );
};

export default DashboardHome;
