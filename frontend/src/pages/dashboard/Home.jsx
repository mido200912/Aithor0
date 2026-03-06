import { useState, useEffect } from 'react';
import axios from 'axios';
import './DashboardHome.css';

const DashboardHome = () => {
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

    if (loading) return <div className="loading-state">جاري تحميل البيانات...</div>;
    // We can show error but might prefer showing zeros or a safe state

    return (
        <div className="dashboard-home animate-fade-in">
            <h1 className="page-title">لوحة القيادة</h1>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon purple">
                        <i className="fas fa-comments"></i>
                    </div>
                    <div>
                        <h3>إجمالي المحادثات</h3>
                        <p className="stat-value">{stats.totalConversations}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green">
                        <i className="fas fa-users"></i>
                    </div>
                    <div>
                        <h3>نشط في آخر ساعة</h3>
                        <p className="stat-value">{stats.activeNow}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon blue">
                        <i className="fas fa-robot"></i>
                    </div>
                    <div>
                        <h3>تم حلها بواسطة AI</h3>
                        <p className="stat-value">{stats.aiResolutionRate}%</p>
                    </div>
                </div>
            </div>

            <div className="recent-activity-section">
                <h3>النشاط الحالي</h3>
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
                    <p className="no-activity">لا توجد نشاطات حديثة لعرضها.</p>
                )}
            </div>
        </div>
    );
};

export default DashboardHome;
