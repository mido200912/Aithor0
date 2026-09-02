import { useState, useRef, useMemo } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { secureStorage } from '../../utils/secureStorage';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import './DashboardShared.css';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const WhatsappBulk = () => {
    const { language } = useLanguage();
    const isArabic = language === 'ar';
    const token = secureStorage.getItem('token');

    const [rawNumbers, setRawNumbers] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [countdown, setCountdown] = useState(0);
    const [results, setResults] = useState([]);
    const cancelRef = useRef(false);

    const parsedNumbers = useMemo(() => {
        if (!rawNumbers.trim()) return [];
        // Split by commas, newlines, semicolons, spaces, tabs
        const parts = rawNumbers.split(/[\n,;\s]+/).map(s => s.trim()).filter(Boolean);
        const cleaned = parts.map(p => {
            // Keep only digits and plus, then strip plus for sending (Meta expects digits only)
            // Normalize: remove non-digit, handle leading 00, +, etc.
            let digits = p.replace(/[^0-9+]/g, '');
            // Remove leading +
            if (digits.startsWith('+')) digits = digits.slice(1);
            // Remove leading 00 if present (international)
            if (digits.startsWith('00')) digits = digits.slice(2);
            digits = digits.replace(/\D/g, '');
            return digits;
        }).filter(d => d.length >= 8 && d.length <= 15);
        // Deduplicate
        return [...new Set(cleaned)];
    }, [rawNumbers]);

    const sentCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const pendingCount = parsedNumbers.length - sentCount - failedCount - (isSending && currentIndex >=0 ? 1 : 0);
    const progressPercent = parsedNumbers.length > 0 ? Math.round(((sentCount + failedCount) / parsedNumbers.length) * 100) : 0;

    const handleStart = async () => {
        if (!message.trim()) {
            alert(isArabic ? 'الرجاء كتابة نص الرسالة' : 'Please enter a message');
            return;
        }
        if (parsedNumbers.length === 0) {
            alert(isArabic ? 'الرجاء إدخال أرقام صحيحة (8-15 رقم)' : 'Please enter valid numbers (8-15 digits)');
            return;
        }
        if (parsedNumbers.length > 150) {
            if (!confirm(isArabic ? `أنت تحاول الإرسال إلى ${parsedNumbers.length} رقم. قد يستغرق ذلك وقتاً طويلاً. هل تريد المتابعة؟` : `You are about to send to ${parsedNumbers.length} numbers. This will take a while. Continue?`)) return;
        }

        setIsSending(true);
        cancelRef.current = false;
        setCurrentIndex(-1);
        setCountdown(0);
        const initial = parsedNumbers.map(num => ({ number: num, status: 'pending', error: null }));
        setResults(initial);

        for (let i = 0; i < parsedNumbers.length; i++) {
            if (cancelRef.current) {
                setResults(prev => prev.map((r, idx) => idx >= i && r.status === 'pending' ? { ...r, status: 'cancelled' } : r));
                break;
            }
            setCurrentIndex(i);
            setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'sending' } : r));

            try {
                await axios.post(`${BACKEND_URL}/handoff/reply`, {
                    userId: parsedNumbers[i],
                    platform: 'whatsapp',
                    message: message.trim()
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'sent' } : r));
            } catch (e) {
                const errMsg = e.response?.data?.error || e.message || 'Failed';
                setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'failed', error: errMsg } : r));
            }

            // 10-second delay between sends (except after last)
            if (i < parsedNumbers.length - 1 && !cancelRef.current) {
                for (let s = 10; s > 0; s--) {
                    if (cancelRef.current) break;
                    setCountdown(s);
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise(res => setTimeout(res, 1000));
                }
                setCountdown(0);
            }
        }

        setIsSending(false);
        setCurrentIndex(-1);
        setCountdown(0);
    };

    const handleStop = () => {
        cancelRef.current = true;
        setCountdown(0);
    };

    const handleClear = () => {
        if (isSending) return;
        setRawNumbers('');
        setMessage('');
        setResults([]);
        setCurrentIndex(-1);
        setCountdown(0);
    };

    const exampleNumbers = isArabic
        ? 'مثال:\n201012345678\n201112345678, 201223456789\n+201001234567'
        : 'Example:\n201012345678\n201112345678, 201223456789\n+201001234567';

    return (
        <div className="whatsapp-bulk-page animate-fade-in" style={{ direction: isArabic ? 'rtl' : 'ltr' }}>
            {/* ── Header ── */}
            <div className="dash-page-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '52px', height: '52px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 55%, #075E54 100%)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.6rem', boxShadow: '0 10px 24px rgba(37,211,102,0.25)', position: 'relative'
                    }}>
                        <i className="fas fa-paper-plane" style={{ fontSize: '1.2rem', marginInlineStart: '2px' }} />
                        <span style={{
                            position: 'absolute', top: '-6px', insetInlineEnd: '-6px',
                            background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: 'white',
                            fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: '20px', letterSpacing: '0.04em'
                        }}>BULK</span>
                    </div>
                    <div>
                        <h1 className="dash-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            {isArabic ? 'الإرسال الجماعي عبر واتساب' : 'WhatsApp Bulk Sender'}
                            <span style={{
                                fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.07em',
                                background: 'linear-gradient(135deg, rgba(37,211,102,0.12), rgba(18,140,126,0.12))',
                                border: '1px solid rgba(37,211,102,0.18)', color: '#128C7E',
                                padding: '4px 10px', borderRadius: '20px'
                            }}>{isArabic ? 'بريميوم' : 'PREMIUM'}</span>
                        </h1>
                        <p className="dash-page-subtitle">
                            {isArabic
                                ? 'أرسل رسالة جماعية مع فاصل 10 ثوانٍ لتجنب الحظر — تظهر جميع الرسائل في صندوق الوارد'
                                : 'Broadcast with a 10-second delay to avoid bans — all messages appear in Inbox'}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Link to="/dashboard/whatsapp" className="dash-btn dash-btn-outline" style={{ padding: '10px 16px', height: 'auto', fontSize: '0.85rem', borderRadius: '12px' }}>
                        <i className="fab fa-whatsapp" /> {isArabic ? 'العودة لواتساب' : 'Back to WhatsApp'}
                    </Link>
                    <Link to="/dashboard/conversations" className="dash-btn" style={{ padding: '10px 16px', height: 'auto', fontSize: '0.85rem', background: '#111827', color: 'white', border: 'none', borderRadius: '12px' }}>
                        <i className="fas fa-inbox" /> {isArabic ? 'صندوق الوارد' : 'Inbox'}
                    </Link>
                </div>
            </div>

            {/* ── Stats ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                {[
                    { label: isArabic ? 'إجمالي الأرقام' : 'Total Numbers', value: parsedNumbers.length, icon: 'fa-users', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: 'rgba(37,211,102,0.18)', col: '#128C7E' },
                    { label: isArabic ? 'تم الإرسال' : 'Sent', value: sentCount, icon: 'fa-check-circle', bg: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', border: 'rgba(16,185,129,0.2)', col: '#059669' },
                    { label: isArabic ? 'فشل' : 'Failed', value: failedCount, icon: 'fa-exclamation-circle', bg: 'linear-gradient(135deg,#fef2f2,#fee2e2)', border: 'rgba(239,68,68,0.15)', col: '#dc2626' },
                    { label: isArabic ? 'متبقي' : 'Remaining', value: Math.max(0, parsedNumbers.length - sentCount - failedCount), icon: 'fa-hourglass-half', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: 'rgba(245,158,11,0.15)', col: '#d97706' },
                ].map((s) => (
                    <div key={s.label} className="dash-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.col, fontSize: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flexShrink: 0 }}>
                            <i className={`fas ${s.icon}`} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#111827', lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--dash-text-sec)', marginTop: '4px', letterSpacing: '0.02em' }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Progress (when sending) ── */}
            <AnimatePresence>
                {isSending && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="dash-card" style={{ padding: '18px', marginBottom: '18px', background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)', border: 'none', color: 'white', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#25D366', boxShadow: '0 0 0 6px rgba(37,211,102,0.18)', animation: 'pulse 1.5s infinite' }} />
                                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                                    {isArabic ? 'جاري الإرسال...' : 'Broadcasting...'} {currentIndex >= 0 ? `${currentIndex + 1} / ${parsedNumbers.length}` : ''}
                                </span>
                                {countdown > 0 && (
                                    <span style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.14)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                                        ⏳ {isArabic ? 'الانتظار' : 'Next in'} {countdown}s
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, background: 'rgba(37,211,102,0.14)', color: '#86efac', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(37,211,102,0.2)' }}>{progressPercent}%</span>
                        </div>
                        <div style={{ height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <motion.div
                                style={{ height: '100%', background: 'linear-gradient(90deg,#25D366,#128C7E)', borderRadius: '20px' }}
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', fontSize: '0.75rem', opacity: 0.7, flexWrap: 'wrap' }}>
                            <span><i className="fas fa-bolt" style={{ color: '#f59e0b' }} /> {isArabic ? 'فاصل 10 ثوانٍ لتجنب الحظر' : '10s delay to avoid bans'}</span>
                            <span style={{ opacity: 0.4 }}>•</span>
                            <span>{isArabic ? 'الرسائل تظهر في الدردشة العادية' : 'Messages appear in normal chat'} <i className="fas fa-check" style={{ color: '#25D366' }} /></span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '18px', alignItems: 'start' }}>
                {/* ── Left: Inputs ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div className="dash-card" style={{ padding: '20px', borderRadius: '18px', border: '1px solid var(--dash-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '10px', flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--dash-text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}><i className="fas fa-list-ol" /></span>
                                {isArabic ? 'قائمة الأرقام' : 'Recipient Numbers'}
                                {parsedNumbers.length > 0 && <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', border: '1px solid #bbf7d0' }}>{parsedNumbers.length} {isArabic ? 'رقم' : 'numbers'}</span>}
                            </h3>
                            <button onClick={handleClear} disabled={isSending} className="dash-btn dash-btn-outline" style={{ height: 'auto', padding: '6px 12px', fontSize: '0.78rem', borderRadius: '10px', opacity: isSending ? 0.5 : 1 }}>
                                <i className="fas fa-eraser" /> {isArabic ? 'مسح' : 'Clear'}
                            </button>
                        </div>

                        <div className="dash-input-group" style={{ marginBottom: '12px' }}>
                            <label className="dash-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                                {isArabic ? 'الصق الأرقام (سطر لكل رقم أو مفصولة بفواصل)' : 'Paste numbers (one per line or comma separated)'}
                                <span style={{ color: '#9ca3af', fontWeight: 500 }}>{isArabic ? '— يدعم +، مسافات، فواصل' : '— supports +, spaces, commas'}</span>
                            </label>
                            <textarea
                                className="dash-textarea"
                                placeholder={exampleNumbers}
                                value={rawNumbers}
                                onChange={e => setRawNumbers(e.target.value)}
                                disabled={isSending}
                                style={{ minHeight: '180px', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '0.9rem', lineHeight: 1.6, borderRadius: '14px', border: '1px solid var(--dash-border)', background: isSending ? 'var(--dash-bg)' : 'white', opacity: isSending ? 0.7 : 1 }}
                            />
                        </div>

                        {/* Parsed preview chips */}
                        {parsedNumbers.length > 0 && (
                            <div style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.14)', borderRadius: '12px', padding: '12px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#128C7E', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fas fa-eye" /> {isArabic ? 'معاينة الأرقام المُحللة' : 'Parsed preview'} — {parsedNumbers.length}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                                    {parsedNumbers.slice(0, 40).map((n, i) => (
                                        <span key={n + i} style={{ background: 'white', border: '1px solid #e5e7eb', color: '#111827', fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', fontFamily: 'monospace' }}>
                                            {n}
                                            {results[i]?.status === 'sent' && <i className="fas fa-check" style={{ color: '#16a34a', marginInlineStart: '6px' }} />}
                                            {results[i]?.status === 'failed' && <i className="fas fa-times" style={{ color: '#dc2626', marginInlineStart: '6px' }} />}
                                            {results[i]?.status === 'sending' && <i className="fas fa-spinner fa-spin" style={{ color: '#d97706', marginInlineStart: '6px' }} />}
                                        </span>
                                    ))}
                                    {parsedNumbers.length > 40 && <span style={{ fontSize: '0.75rem', color: 'var(--dash-text-sec)', alignSelf: 'center', fontWeight: 700 }}>+{parsedNumbers.length - 40} {isArabic ? 'المزيد' : 'more'}</span>}
                                </div>
                            </div>
                        )}

                        {rawNumbers && parsedNumbers.length === 0 && (
                            <div style={{ marginTop: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 12px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 600 }}>
                                <i className="fas fa-exclamation-triangle" /> {isArabic ? 'لم يتم التعرف على أي رقم صحيح. تأكد أن الأرقام 8-15 خانة مع رمز الدولة.' : 'No valid numbers detected. Ensure numbers are 8-15 digits with country code.'}
                            </div>
                        )}
                    </div>

                    <div className="dash-card" style={{ padding: '20px', borderRadius: '18px', border: '1px solid var(--dash-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
                        <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 900, color: 'var(--dash-text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}><i className="fas fa-comment-dots" /></span>
                            {isArabic ? 'نص الرسالة' : 'Message'}
                            <span style={{ marginInlineStart: 'auto', fontSize: '0.72rem', fontWeight: 700, color: message.length > 4000 ? '#dc2626' : 'var(--dash-text-sec)', background: message.length > 4000 ? '#fee2e2' : 'var(--dash-bg)', border: `1px solid ${message.length > 4000 ? '#fecaca' : 'var(--dash-border)'}`, padding: '3px 8px', borderRadius: '20px' }}>
                                {message.length} / 4096
                            </span>
                        </h3>
                        <textarea
                            className="dash-textarea"
                            placeholder={isArabic ? 'مرحبا {{name}}! 👋\nاكتب رسالتك هنا... سيتم إرسالها كما هي لكل رقم.' : 'Hello {{name}}! 👋\nType your broadcast message here... It will be sent as-is to every number.'}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            disabled={isSending}
                            maxLength={4096}
                            style={{ minHeight: '160px', fontSize: '0.95rem', lineHeight: 1.6, borderRadius: '14px', border: `1px solid ${message.length > 4000 ? '#fecaca' : 'var(--dash-border)'}`, opacity: isSending ? 0.7 : 1 }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', fontSize: '0.72rem', color: 'var(--dash-text-sec)', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', color: '#2563eb', padding: '5px 10px', borderRadius: '20px', fontWeight: 700 }}>
                                <i className="fab fa-whatsapp" /> WhatsApp max 4096
                            </span>
                            <span style={{ opacity: 0.6 }}>•</span>
                            <span>{isArabic ? 'استخدم سطر جديد للفقرات' : 'Use new lines for paragraphs'}</span>
                        </div>
                    </div>

                    {/* Action bar */}
                    <div className="dash-card" style={{ padding: '16px', borderRadius: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(249,250,251,0.9))', border: '1px solid var(--dash-border)', backdropFilter: 'blur(6px)' }}>
                        {!isSending ? (
                            <button
                                onClick={handleStart}
                                disabled={parsedNumbers.length === 0 || !message.trim()}
                                className="dash-btn"
                                style={{
                                    flex: '1 1 220px',
                                    background: (parsedNumbers.length === 0 || !message.trim()) ? '#9ca3af' : 'linear-gradient(135deg,#25D366,#128C7E)',
                                    color: 'white', border: 'none', padding: '14px 20px', borderRadius: '12px',
                                    fontWeight: 900, fontSize: '0.95rem', boxShadow: (parsedNumbers.length === 0 || !message.trim()) ? 'none' : '0 8px 16px rgba(37,211,102,0.25)',
                                    cursor: (parsedNumbers.length === 0 || !message.trim()) ? 'not-allowed' : 'pointer', opacity: (parsedNumbers.length === 0 || !message.trim()) ? 0.7 : 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                }}
                            >
                                <i className="fas fa-paper-plane" />
                                {isArabic ? `ابدأ الإرسال إلى ${parsedNumbers.length} رقم` : `Start Sending to ${parsedNumbers.length} numbers`}
                                {parsedNumbers.length > 0 && <span style={{ background: 'rgba(255,255,255,0.18)', padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem' }}>10s delay</span>}
                            </button>
                        ) : (
                            <button
                                onClick={handleStop}
                                className="dash-btn"
                                style={{ flex: '1 1 220px', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white', border: 'none', padding: '14px 20px', borderRadius: '12px', fontWeight: 900, fontSize: '0.95rem', boxShadow: '0 8px 16px rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                            >
                                <i className="fas fa-stop-circle" />
                                {isArabic ? 'إيقاف الإرسال' : 'Stop Sending'}
                                {countdown > 0 && <span style={{ background: 'rgba(255,255,255,0.18)', padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem' }}>{countdown}s</span>}
                            </button>
                        )}
                        <div style={{ fontSize: '0.75rem', color: 'var(--dash-text-sec)', lineHeight: 1.5, flex: '1 1 180px', fontWeight: 600 }}>
                            <i className="fas fa-shield-alt" style={{ color: '#10b981' }} /> {isArabic ? 'فاصل 10 ثوانٍ بين كل رسالة لتجنب الحظر — آمن ومدروس' : '10-second gap between each message to avoid bans — safe & compliant'}
                        </div>
                    </div>
                </div>

                {/* ── Right: Live progress + tips ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'sticky', top: '16px' }}>
                    {/* Live log */}
                    <div className="dash-card" style={{ padding: 0, borderRadius: '18px', overflow: 'hidden', border: '1px solid var(--dash-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', maxHeight: '520px' }}>
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--dash-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #f8fafc, #ffffff)', position: 'sticky', top: 0, zIndex: 1 }}>
                            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--dash-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fas fa-stream" style={{ color: '#25D366' }} /> {isArabic ? 'سجل الإرسال المباشر' : 'Live Delivery Log'}
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, background: isSending ? 'rgba(245,158,11,0.12)' : 'var(--dash-bg)', color: isSending ? '#d97706' : 'var(--dash-text-sec)', border: `1px solid ${isSending ? 'rgba(245,158,11,0.18)' : 'var(--dash-border)'}`, padding: '3px 10px', borderRadius: '20px' }}>
                                {isSending ? (isArabic ? '● مباشر' : '● LIVE') : (isArabic ? 'جاهز' : 'READY')}
                            </span>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '220px', background: 'var(--dash-bg)' }}>
                            {results.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--dash-text-sec)' }}>
                                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'white', border: '1px solid var(--dash-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#cbd5e1', fontSize: '1.2rem' }}>
                                        <i className="fas fa-inbox" />
                                    </div>
                                    <div style={{ fontWeight: 800, color: 'var(--dash-text)', fontSize: '0.9rem' }}>{isArabic ? 'لا يوجد إرسال بعد' : 'No sends yet'}</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: '6px', lineHeight: 1.5 }}>
                                        {isArabic ? 'الصق أرقامك وابدأ الإرسال لتظهر النتائج هنا لحظياً.' : 'Paste numbers and hit Send to see real-time results here.'}
                                    </div>
                                </div>
                            ) : (
                                results.map((r, idx) => (
                                    <div key={r.number + idx} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        background: 'var(--dash-card)', border: '1px solid var(--dash-border)',
                                        borderRadius: '12px', padding: '10px 12px',
                                        borderInlineStart: `3px solid ${r.status === 'sent' ? '#10b981' : r.status === 'failed' ? '#ef4444' : r.status === 'sending' ? '#f59e0b' : r.status === 'cancelled' ? '#9ca3af' : '#e5e7eb'}`,
                                        opacity: r.status === 'cancelled' ? 0.6 : 1
                                    }}>
                                        <span style={{
                                            width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0,
                                            background: r.status === 'sent' ? '#dcfce7' : r.status === 'failed' ? '#fee2e2' : r.status === 'sending' ? '#fef3c7' : r.status === 'cancelled' ? '#f3f4f6' : '#f8fafc',
                                            color: r.status === 'sent' ? '#16a34a' : r.status === 'failed' ? '#dc2626' : r.status === 'sending' ? '#d97706' : r.status === 'cancelled' ? '#6b7280' : '#94a3b8',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem'
                                        }}>
                                            {r.status === 'sent' && <i className="fas fa-check" />}
                                            {r.status === 'failed' && <i className="fas fa-times" />}
                                            {r.status === 'sending' && <i className="fas fa-spinner fa-spin" />}
                                            {r.status === 'pending' && <span style={{ fontWeight: 800, fontSize: '0.65rem' }}>{idx + 1}</span>}
                                            {r.status === 'cancelled' && <i className="fas fa-ban" />}
                                        </span>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', color: 'var(--dash-text)', flex: 1 }}>{r.number}</span>
                                        <span style={{
                                            fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.03em', textTransform: 'uppercase',
                                            background: r.status === 'sent' ? '#dcfce7' : r.status === 'failed' ? '#fee2e2' : r.status === 'sending' ? '#fef3c7' : r.status === 'cancelled' ? '#f3f4f6' : 'var(--dash-bg)',
                                            color: r.status === 'sent' ? '#166534' : r.status === 'failed' ? '#991b1b' : r.status === 'sending' ? '#92400e' : '#6b7280',
                                            border: `1px solid ${r.status === 'sent' ? '#bbf7d0' : r.status === 'failed' ? '#fecaca' : r.status === 'sending' ? '#fde68a' : 'var(--dash-border)'}`,
                                            padding: '3px 8px', borderRadius: '20px', whiteSpace: 'nowrap'
                                        }}>
                                            {r.status === 'sent' && (isArabic ? 'تم الإرسال' : 'Sent')}
                                            {r.status === 'failed' && (isArabic ? 'فشل' : 'Failed')}
                                            {r.status === 'sending' && (isArabic ? 'جاري...' : 'Sending...')}
                                            {r.status === 'pending' && (isArabic ? 'انتظار' : 'Pending')}
                                            {r.status === 'cancelled' && (isArabic ? 'ملغى' : 'Cancelled')}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        {results.length > 0 && (
                            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--dash-border)', background: 'linear-gradient(135deg, #ffffff, #f8fafc)', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--dash-text-sec)' }}>
                                    {isArabic ? `اكتمل ${sentCount + failedCount} من ${parsedNumbers.length}` : `${sentCount + failedCount} of ${parsedNumbers.length} completed`}
                                </span>
                                {!isSending && (sentCount + failedCount) > 0 && (
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#128C7E' }}>
                                        ✔ {isArabic ? 'يمكنك مراجعة المحادثات في صندوق الوارد' : 'Check Inbox for chat threads'} →
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Tips / Info premium card */}
                    <div className="dash-card" style={{ padding: '18px', borderRadius: '18px', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 40%, #ffffff 100%)', border: '1px solid rgba(37,211,102,0.15)', boxShadow: '0 8px 24px rgba(37,211,102,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'white', border: '1px solid rgba(37,211,102,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25D366', boxShadow: '0 2px 8px rgba(37,211,102,0.12)' }}><i className="fas fa-lightbulb" /></span>
                            <span style={{ fontWeight: 900, color: '#065f46', fontSize: '0.95rem' }}>{isArabic ? 'نصائح للإرسال الآمن' : 'Safe Sending Tips'}</span>
                        </div>
                        <ul style={{ margin: 0, paddingInlineStart: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: '#065f46', lineHeight: 1.6, fontWeight: 600 }}>
                            <li>{isArabic ? 'يتم الإرسال بفاصل 10 ثوانٍ لتجنب حظر واتساب' : '10-second pacing protects your number from spam flags'}</li>
                            <li>{isArabic ? 'كل رسالة تُحفظ في المحادثات العادية — الردود تظهر هناك' : 'Every message is saved to normal chat — replies appear in Inbox'}</li>
                            <li>{isArabic ? 'استخدم رموز الدولة كاملة (مثال: 20 لمصر، 966 للسعودية)' : 'Always include full country code (e.g., 20 for EG, 966 for SA)'}</li>
                            <li>{isArabic ? 'يمكنك إيقاف العملية في أي وقت بزر الإيقاف' : 'You can stop at any time with the Stop button'}</li>
                        </ul>
                        <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                            <Link to="/dashboard/conversations" className="dash-btn" style={{ flex: 1, background: 'white', color: '#065f46', border: '1px solid rgba(37,211,102,0.18)', borderRadius: '12px', fontWeight: 800, fontSize: '0.82rem', padding: '10px', justifyContent: 'center' }}>
                                <i className="fas fa-comments" /> {isArabic ? 'عرض المحادثات' : 'View Inbox'}
                            </Link>
                        </div>
                    </div>

                    {/* Error details collapsible */}
                    {failedCount > 0 && (
                        <div className="dash-card" style={{ padding: '16px', borderRadius: '14px', border: '1px solid #fecaca', background: '#fef2f2' }}>
                            <div style={{ fontWeight: 900, color: '#991b1b', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fas fa-exclamation-triangle" /> {isArabic ? `فشل الإرسال لـ ${failedCount} رقم` : `Failed for ${failedCount} number(s)`}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                                {results.filter(r => r.status === 'failed').slice(0, 6).map((r, i) => (
                                    <div key={i} style={{ fontSize: '0.75rem', color: '#7f1d1d', background: 'white', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{r.number}</span>
                                        <span style={{ opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>{r.error}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(37,211,102,0.4)} 70% { box-shadow: 0 0 0 6px rgba(37,211,102,0)} 100% { box-shadow: 0 0 0 0 rgba(37,211,102,0)} }
                @media (max-width: 960px) {
                    .whatsapp-bulk-page > div:nth-of-type(3) { grid-template-columns: 1fr !important; }
                    .whatsapp-bulk-page > div:nth-of-type(3) > div:last-child { position: static !important; }
                }
            `}</style>
        </div>
    );
};

export default WhatsappBulk;
