import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './AgentsExplorer.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ─── helpers ─── */
const PALETTE = [
  '#6C63FF','#2563eb','#16a34a','#d97706',
  '#db2777','#0891b2','#7c3aed','#dc2626',
];
const getColor    = (name = '') => PALETTE[name.charCodeAt(0) % PALETTE.length];
const getInitials = (name = '') => name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

/* ══════════════════════════════════════
   صفحة عرض كل الشركات
══════════════════════════════════════ */
const AgentsExplorer = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [industry, setIndustry]   = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/public/companies`)
      .then(({ data }) => { if (data.success) setCompanies(data.companies); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const industries = ['all', ...new Set(companies.map(c => c.industry).filter(Boolean))];

  const filtered = companies.filter(c => {
    const matchS = c.name?.toLowerCase().includes(search.toLowerCase()) ||
                   c.description?.toLowerCase().includes(search.toLowerCase());
    const matchI = industry === 'all' || c.industry === industry;
    return matchS && matchI;
  });

  return (
    <div className="ae-page">

      {/* ── TOP BAR ── */}
      <nav className="ae-topbar">
        <Link to="/" className="ae-topbar-logo">
          <img src="/logo.png" alt="VOXIO" />
          <span>VOXIO</span>
        </Link>
        <div className="ae-topbar-center">
          <i className="fas fa-robot" />
          <span>Agents Explorer</span>
        </div>
        <div className="ae-topbar-right">
          <Link to="/login" className="ae-topbar-btn">
            <i className="fas fa-grid-2" />
            Dashboard
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="ae-hero">
        <div className="ae-hero-inner">
          <div className="ae-badge">
            <i className="fas fa-circle-nodes" />
            <span>Live AI Agents</span>
          </div>
          <h1>اكتشف وكلاء الذكاء الاصطناعي</h1>
          <p>اختر أي شركة وتحدث مع وكيلها المدرَّب مباشرةً — بدون ما تحتاج مفتاح API</p>

          {/* Search */}
          <div className="ae-search-wrap">
            <i className="fas fa-magnifying-glass ae-search-ico" />
            <input
              className="ae-search"
              type="text"
              placeholder="ابحث عن شركة أو صناعة..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="ae-search-clear" onClick={() => setSearch('')}>
                <i className="fas fa-xmark" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="ae-filters">
            {industries.map(ind => (
              <button
                key={ind}
                className={`ae-filter-btn ${industry === ind ? 'active' : ''}`}
                onClick={() => setIndustry(ind)}
              >
                <i className={`fas ${ind === 'all' ? 'fa-globe' : 'fa-tag'}`} />
                {ind === 'all' ? 'الكل' : ind}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── GRID ── */}
      <div className="ae-container">
        {loading ? (
          <div className="ae-grid">
            {[...Array(6)].map((_, i) => <div key={i} className="ae-skeleton" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="ae-empty">
            <div className="ae-empty-icon-wrap">
              <i className="fas fa-robot" />
            </div>
            <h3>{search ? `لا توجد نتائج لـ "${search}"` : 'لا توجد شركات مسجّلة بعد'}</h3>
            <p>كن أول من يُنشئ وكيلاً ذكياً على VOXIO</p>
            <Link to="/register" className="ae-empty-btn">
              <i className="fas fa-plus" />
              أنشئ وكيلك الآن
            </Link>
          </div>
        ) : (
          <>
            <div className="ae-count-bar">
              <span><i className="fas fa-layer-group" /> {filtered.length} وكيل متاح</span>
              {industry !== 'all' && (
                <button className="ae-clear-filter" onClick={() => setIndustry('all')}>
                  <i className="fas fa-xmark" /> مسح الفلتر
                </button>
              )}
            </div>
            <div className="ae-grid">
              {filtered.map(company => {
                const color = getColor(company.name);
                return (
                  <div
                    key={company._id}
                    className="ae-card"
                    onClick={() => navigate(`/chat/${company.slug}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navigate(`/chat/${company.slug}`)}
                  >
                    {/* Card Header */}
                    <div className="ae-card-header">
                      <div className="ae-avatar" style={{ background: color }}>
                        {getInitials(company.name)}
                      </div>
                      <div className="ae-live-badge">
                        <span className="ae-live-dot" />
                        Live
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="ae-card-body">
                      <h3>{company.name}</h3>
                      {company.industry && (
                        <div className="ae-industry">
                          <i className="fas fa-tag" />
                          {company.industry}
                        </div>
                      )}
                      <p>{company.description || 'وكيل ذكاء اصطناعي مدرَّب ومُعدّ للمساعدة.'}</p>
                    </div>

                    {/* Card Footer */}
                    <div className="ae-card-footer">
                      <div className="ae-card-cta">
                        <i className="fas fa-comments" />
                        <span>ابدأ المحادثة</span>
                        <i className="fas fa-arrow-left ae-arrow" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div className="ae-footer">
        <span>Powered by</span>
        <Link to="/"><img src="/logo.png" alt="VOXIO" /> VOXIO</Link>
        <span className="ae-footer-sep">·</span>
        <Link to="/register">
          <i className="fas fa-plus" />
          أنشئ وكيلك المجاني
        </Link>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════
   صفحة المحادثة مع وكيل معين
══════════════════════════════════════ */
export const AgentChat = () => {
  const { apiKey } = useParams();
  const navigate   = useNavigate();

  const [company, setCompany]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState('');
  const endRef                  = useRef(null);

  useEffect(() => {
    // If we have an apiKey, we should redirect to the customized ChatPage using the slug
    axios.get(`${API}/public/company/${apiKey}`)
      .then(({ data }) => {
        if (data.success && data.company?.slug) {
          navigate(`/chat/${data.company.slug}`, { replace: true });
        } else if (data.success) {
          setCompany(data.company);
          setMessages([{
            role: 'ai',
            text: `مرحباً! أنا الوكيل الذكي لـ **${data.company.name}**. كيف يمكنني مساعدتك اليوم؟`,
            time: new Date(),
          }]);
        } else { setError('الشركة غير موجودة'); }
      })
      .catch(() => setError('خطأ في تحميل بيانات الشركة'))
      .finally(() => setLoading(false));
  }, [apiKey, navigate]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text, time: new Date() }]);
    setSending(true);
    try {
      const { data } = await axios.post(`${API}/public/chat`, {
        companyApiKey: apiKey,
        prompt: text,
      });
      setMessages(prev => [...prev, {
        role: 'ai',
        text: data.reply || 'لم يتم الحصول على رد.',
        time: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: 'حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مجدداً.',
        time: new Date(),
      }]);
    } finally { setSending(false); }
  };

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = d => new Date(d).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  const renderText = text => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i}>{p.slice(2,-2)}</strong>
        : p
    );
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="ac-screen-center">
      <div className="ac-spinner" />
      <p>جارٍ تحميل الوكيل...</p>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="ac-screen-center">
      <div className="ac-error-icon-wrap"><i className="fas fa-triangle-exclamation" /></div>
      <h2>{error}</h2>
      <button className="ac-back-btn" onClick={() => navigate('/agents')}>
        <i className="fas fa-arrow-right" />
        العودة للوكلاء
      </button>
    </div>
  );

  const color = getColor(company.name);

  return (
    <div className="ac-page">

      {/* ── HEADER ── */}
      <div className="ac-header">
        <button className="ac-back-link" onClick={() => navigate('/agents')}>
          <i className="fas fa-arrow-right" />
          <span>عودة</span>
        </button>

        <div className="ac-header-company">
          <div className="ac-header-avatar" style={{ background: color }}>
            {getInitials(company.name)}
          </div>
          <div className="ac-header-info">
            <h2>{company.name}</h2>
            <div className="ac-header-status">
              <span className="ac-live-dot" />
              <span>وكيل ذكي · متاح الآن</span>
            </div>
          </div>
        </div>

        <div className="ac-header-meta">
          {company.industry && (
            <div className="ac-industry-pill">
              <i className="fas fa-tag" />
              {company.industry}
            </div>
          )}
          <Link to="/agents" className="ac-explore-link">
            <i className="fas fa-compass" />
            <span>استعرض</span>
          </Link>
        </div>
      </div>

      {/* ── MESSAGES ── */}
      <div className="ac-messages">

        {/* Company intro */}
        {company.description && (
          <div className="ac-intro-card">
            <div className="ac-intro-header">
              <div className="ac-intro-avatar" style={{ background: color }}>
                {getInitials(company.name)}
              </div>
              <div>
                <strong>{company.name}</strong>
                {company.industry && (
                  <span className="ac-intro-ind">
                    <i className="fas fa-tag" />{company.industry}
                  </span>
                )}
              </div>
            </div>
            <p>{company.description}</p>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <div key={i} className={`ac-row ${msg.role}`}>
            {msg.role === 'ai' && (
              <div className="ac-msg-avatar" style={{ background: color }}>
                {getInitials(company.name)}
              </div>
            )}
            <div className={`ac-bubble ${msg.role}`} style={msg.role === 'user' ? { background: color } : {}}>
              <p>{renderText(msg.text)}</p>
              <time>{formatTime(msg.time)}</time>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="ac-row ai">
            <div className="ac-msg-avatar" style={{ background: color }}>
              {getInitials(company.name)}
            </div>
            <div className="ac-bubble ai ac-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* ── INPUT ── */}
      <div className="ac-input-area">
        <div className="ac-input-wrap">
          <textarea
            className="ac-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`اسأل ${company.name}...`}
            rows={1}
            disabled={sending}
          />
          <button
            className="ac-send"
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            style={{ background: color }}
            title="إرسال"
          >
            <i className={`fas ${sending ? 'fa-ellipsis' : 'fa-paper-plane'}`} />
          </button>
        </div>
        <p className="ac-hint">
          <i className="fas fa-keyboard" /> اضغط <kbd>Enter</kbd> للإرسال &nbsp;·&nbsp; <kbd>Shift+Enter</kbd> لسطر جديد
        </p>
      </div>
    </div>
  );
};

export default AgentsExplorer;
