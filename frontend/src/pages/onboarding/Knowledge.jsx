import { useState } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import '../../pages/auth/Auth.css';

const OnboardingKnowledge = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('token');

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles([...files, ...Array.from(e.target.files)]);
        }
    };

    const handleSkip = () => {
        navigate('/onboarding/connect');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (files.length === 0) return;

        setUploading(true);
        let completed = 0;

        // Upload files sequentially to avoid server overload
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                await axios.post(`${BACKEND_URL}/ai/upload`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
                completed++;
                setProgress(Math.round((completed / files.length) * 100));
            } catch (error) {
                console.error(`Error uploading ${file.name}:`, error);
                // Continue with other files even if one fails
            }
        }

        setUploading(false);
        // After uploads, go to next step
        navigate('/onboarding/connect');
    };

    return (
        <div className="auth-container">
            <div className="auth-card animate-fade-in" style={{ maxWidth: '600px' }}>
                <div className="auth-header">
                    <h2>قاعدة المعرفة والتدريب</h2>
                    <p>قم برفع ملفات PDF أو كتالوجات شركتك ليتعلم منها الذكاء الاصطناعي ويجيب عن العملاء بدقة</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="upload-area" style={{
                        border: uploading ? '2px solid var(--color-primary)' : '2px dashed var(--color-border)',
                        padding: '2rem',
                        textAlign: 'center',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '1.5rem',
                        cursor: uploading ? 'default' : 'pointer',
                        backgroundColor: uploading ? '#f8f9fa' : 'transparent'
                    }}>
                        {!uploading ? (
                            <>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                    id="file-upload"
                                    accept=".pdf,.docx,.txt"
                                />
                                <label htmlFor="file-upload" style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
                                    <i className="fas fa-cloud-upload-alt" style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--color-text-secondary)' }}></i>
                                    <p>اضغط هنا لرفع الملفات (PDF, DOCX)</p>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                        (سيتم استخراج المعلومات تلقائياً وتدريب البوت عليها)
                                    </span>
                                </label>
                            </>
                        ) : (
                            <div className="uploading-state">
                                <i className="fas fa-cog fa-spin" style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--color-primary)' }}></i>
                                <p>جاري تحليل الملفات واستخراج المعرفة...</p>
                                <div className="progress-bar-container" style={{ width: '100%', height: '8px', background: '#ddd', borderRadius: '4px', marginTop: '10px' }}>
                                    <div className="progress-bar" style={{ width: `${progress}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '4px', transition: 'width 0.3s' }}></div>
                                </div>
                                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', display: 'block', marginTop: '5px' }}>{progress}% مكتمل</span>
                            </div>
                        )}
                    </div>

                    {files.length > 0 && !uploading && (
                        <div className="file-list" style={{ marginBottom: '1.5rem' }}>
                            <h4>الملفات الجاهزة للرفع:</h4>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {files.map((file, index) => (
                                    <li key={index} style={{
                                        padding: '0.5rem',
                                        borderBottom: '1px solid var(--color-border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <i className="fas fa-file-invoice"></i>
                                        {file.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={files.length === 0 || uploading}
                    >
                        {uploading ? 'جاري المعالجة...' : 'بدء التدريب ومتابعة (2/2)'}
                    </button>
                    {!uploading && (
                        <button type="button" className="btn btn-text btn-block" onClick={handleSkip} style={{ marginTop: '0.5rem' }}>
                            تخطي هذه الخطوة حالياً
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default OnboardingKnowledge;
