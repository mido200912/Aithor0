import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './Contact.css';

const Contact = () => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle form submission
        console.log('Form submitted:', formData);
        alert(t.contact.successMessage);
        setFormData({ name: '', email: '', subject: '', message: '' });
    };

    return (
        <section className="contact" id="contact">
            <div className="container">
                <div className="section-header">
                    <span className="section-badge">{t.contact.badge}</span>
                    <h2 className="section-title">
                        {t.contact.titleStart} <span className="gradient-text">{t.contact.titleGradient}</span>{t.contact.titleEnd}
                    </h2>
                    <p className="section-description">
                        {t.contact.description}
                    </p>
                </div>

                <div className="contact-container">
                    <div className="contact-info">
                        <div className="contact-item">
                            <div className="contact-icon">
                                <i className="fas fa-envelope"></i>
                            </div>
                            <div>
                                <h4>{t.contact.email}</h4>
                                <p>support@aithor.com</p>
                            </div>
                        </div>

                        <div className="contact-item">
                            <div className="contact-icon">
                                <i className="fas fa-phone"></i>
                            </div>
                            <div>
                                <h4>{t.contact.phone}</h4>
                                <p>{t.contact.phoneValue}</p>
                            </div>
                        </div>

                        <div className="contact-item">
                            <div className="contact-icon">
                                <i className="fas fa-map-marker-alt"></i>
                            </div>
                            <div>
                                <h4>{t.contact.address}</h4>
                                <p>{t.contact.addressValue}</p>
                            </div>
                        </div>

                        <div className="social-links">
                            <a href="#" className="social-link">
                                <i className="fab fa-facebook-f"></i>
                            </a>
                            <a href="#" className="social-link">
                                <i className="fab fa-twitter"></i>
                            </a>
                            <a href="#" className="social-link">
                                <i className="fab fa-linkedin-in"></i>
                            </a>
                            <a href="#" className="social-link">
                                <i className="fab fa-instagram"></i>
                            </a>
                        </div>
                    </div>

                    <form className="contact-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder={t.contact.formName}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder={t.contact.formEmail}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="text"
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                placeholder={t.contact.formSubject}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                rows="5"
                                placeholder={t.contact.formMessage}
                                required
                            ></textarea>
                        </div>
                        <button type="submit" className="btn btn-primary btn-block">
                            <i className="fas fa-paper-plane"></i>
                            {t.contact.sendButton}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
};

export default Contact;
