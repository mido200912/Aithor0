import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { motion } from 'framer-motion';
import './AiTraining.css';

const AiTraining = () => {
    const { t } = useLanguage();
    const [files, setFiles] = useState([]);
    const [instructions, setInstructions] = useState('');
    const [extractedKnowledge, setExtractedKnowledge] = useState(''); // ✨ جديد
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savingKnowledge, setSavingKnowledge] = useState(false); // ✨ جديد

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchFiles();
        fetchInstructions();
        fetchExtractedKnowledge(); // ✨ جديد
    }, []);

    const fetchFiles = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/ai`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFiles(res.data);
        } catch (error) {
            console.error('Error fetching files:', error);
        }
    };

    const fetchInstructions = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/company`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInstructions(res.data.customInstructions || '');
        } catch (error) {
            console.error('Error fetching instructions:', error);
        }
    };

    // ✨ جلب المعلومات المستخرجة
    const fetchExtractedKnowledge = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/ai/extracted-knowledge`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExtractedKnowledge(res.data.extractedKnowledge || '');
        } catch (error) {
            console.error('Error fetching extracted knowledge:', error);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const res = await axios.post(`${BACKEND_URL}/ai/upload`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            alert('✅ تم رفع الملف واستخراج المعلومات بنجاح!');
            fetchFiles();

            // ✨ تحديث المعلومات المستخرجة فوراً
            if (res.data.extractedKnowledge) {
                setExtractedKnowledge(res.data.extractedKnowledge);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('حدث خطأ أثناء رفع الملف');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDeleteFile = async (fileId) => {
        if (!confirm('هل أنت متأكد من حذف هذا الملف؟')) return;

        try {
            await axios.delete(`${BACKEND_URL}/ai/${fileId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchFiles();
            alert('تم حذف الملف بنجاح');
        } catch (error) {
            console.error('Delete error:', error);
            alert('حدث خطأ أثناء حذف الملف');
        }
    };

    const handleSaveInstructions = async () => {
        setSaving(true);
        try {
            await axios.put(`${BACKEND_URL}/ai/instructions`,
                { instructions },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('✅ تم حفظ التعليمات بنجاح!');
        } catch (error) {
            console.error('Save error:', error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    // ✨ حفظ المعلومات المستخرجة
    const handleSaveExtractedKnowledge = async () => {
        setSavingKnowledge(true);
        try {
            await axios.put(`${BACKEND_URL}/ai/extracted-knowledge`,
                { extractedKnowledge },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('✅ تم حفظ المعلومات المستخرجة بنجاح!');
        } catch (error) {
            console.error('Save error:', error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setSavingKnowledge(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="ai-training-container animate-fade-in">
            <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="page-title"
            >
                {t.dashboard.trainingPage.title}
            </motion.h1>
            <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="page-subtitle"
            >
                {t.dashboard.trainingPage.subtitle}
            </motion.p>

            <motion.div
                className="training-grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Knowledge Base Section */}
                <motion.div variants={itemVariants} className="card">
                    <div className="card-header">
                        <i className="fas fa-book"></i>
                        <h3>{t.dashboard.trainingPage.knowledgeBase}</h3>
                    </div>
                    <div className="card-body">
                        <div className="upload-box relative">
                            <input
                                type="file"
                                id="file-upload-training"
                                accept=".pdf,.docx,.txt"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="file-upload-training" className={`upload-label ${uploading ? 'uploading' : ''}`}>
                                <i className={uploading ? "fas fa-spinner fa-spin" : "fas fa-cloud-upload-alt"}></i>
                                <span>{uploading ? t.dashboard.trainingPage.uploadingFile : t.dashboard.trainingPage.uploadBtn}</span>
                                <small>{t.dashboard.trainingPage.uploadHint}</small>
                            </label>
                        </div>

                        <div className="files-list">
                            {files.length === 0 ? (
                                <p className="empty-state">{t.dashboard.trainingPage.noFiles}</p>
                            ) : (
                                files.map((file) => (
                                    <div key={file._id} className="file-item">
                                        <div className="file-info">
                                            <i className={`fas fa-file-${file.fileType === 'pdf' ? 'pdf' : file.fileType === 'docx' ? 'word' : 'alt'}`}></i>
                                            <span>{file.fileName}</span>
                                        </div>
                                        <button
                                            className="btn-icon-delete"
                                            onClick={() => handleDeleteFile(file._id)}
                                            title={t.dashboard.trainingPage.delete}
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* ✨ Extracted Knowledge Section - جديد */}
                <motion.div variants={itemVariants} className="card full-width">
                    <div className="card-header">
                        <i className="fas fa-brain"></i>
                        <h3>{t.dashboard.trainingPage.extractedTitle}</h3>
                    </div>
                    <div className="card-body">
                        <p className="card-description">
                            {t.dashboard.trainingPage.extractedDesc}
                        </p>

                        <textarea
                            className="instructions-textarea"
                            value={extractedKnowledge}
                            onChange={(e) => setExtractedKnowledge(e.target.value)}
                            placeholder={t.dashboard.trainingPage.extractedPlaceholder}
                            rows="15"
                            style={{ minHeight: '300px' }}
                        />

                        <button
                            className="btn btn-primary"
                            onClick={handleSaveExtractedKnowledge}
                            disabled={savingKnowledge}
                        >
                            {savingKnowledge ? t.dashboard.trainingPage.saving : t.dashboard.trainingPage.saveExtracted}
                        </button>
                    </div>
                </motion.div>

                {/* Custom Instructions Section */}
                <motion.div variants={itemVariants} className="card full-width">
                    <div className="card-header">
                        <i className="fas fa-cog"></i>
                        <h3>{t.dashboard.trainingPage.customTitle}</h3>
                    </div>
                    <div className="card-body">
                        <p className="card-description">
                            {t.dashboard.trainingPage.customDesc}
                        </p>

                        <textarea
                            className="instructions-textarea"
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            placeholder={t.dashboard.trainingPage.customPlaceholder}
                            rows="8"
                        />

                        <button
                            className="btn btn-primary"
                            onClick={handleSaveInstructions}
                            disabled={saving}
                        >
                            {saving ? t.dashboard.trainingPage.saving : t.dashboard.trainingPage.saveCustom}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default AiTraining;
