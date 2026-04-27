import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, Bot, LogOut, Trash2, ShieldAlert, Ban, Settings2, Megaphone, 
  Mail, CheckCircle2, Clock, Eye, X, Globe, MessageSquare, ExternalLink, ShieldCheck,
  BrainCircuit, Save, AlertTriangle, UserMinus, ShieldX, FileText, Link as LinkIcon, Building2
} from 'lucide-react';
import './index.css';

const API_URL = 'http://localhost:5001/api/admin';

axios.interceptors.request.use(config => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const Login = ({ setAuth }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      localStorage.setItem('adminToken', res.data.token);
      setAuth(true);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="shield-icon-wrapper">
          <ShieldAlert size={48} className="shield-pulse" />
        </div>
        <h2>VOXIO Secure Admin</h2>
        <p className="login-subtitle">System access requires encrypted authorization.</p>
        {error && <div className="error-alert">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <input type="email" placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <input type="password" placeholder="Access Key" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="login-btn">Initialize Session</button>
        </form>
      </div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-container ${size}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ setAuth }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAuth(false);
    navigate('/login');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header-main">
        <h2><ShieldCheck size={24} className="icon-gold" /> VOXIO HQ</h2>
        <span className="security-status">System Secured</span>
      </div>
      <nav>
        <div className={`nav-item ${location.pathname === '/' ? 'active' : ''}`} onClick={() => navigate('/')}>
          <Users size={20} /> Users & Companies
        </div>
        <div className={`nav-item ${location.pathname === '/agents' ? 'active' : ''}`} onClick={() => navigate('/agents')}>
          <Bot size={20} /> Agents / Integrations
        </div>
        <div className={`nav-item ${location.pathname === '/support' ? 'active' : ''}`} onClick={() => navigate('/support')}>
          <Mail size={20} /> Support Messages
        </div>
        <div className={`nav-item ${location.pathname === '/broadcast' ? 'active' : ''}`} onClick={() => navigate('/broadcast')}>
          <Megaphone size={20} /> System Broadcast
        </div>
      </nav>
      <div className="sidebar-footer-info">
        <div className="server-status">
          <div className="status-dot"></div>
          <span>API: Online</span>
        </div>
        <div className="logout" onClick={handleLogout}>
          <LogOut size={20} /> Logout Session
        </div>
      </div>
    </div>
  );
};

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [aiConfig, setAiConfig] = useState({ 
    name: '', industry: '', description: '', vision: '', mission: '', values: '',
    systemPrompt: '', extractedKnowledge: '', urlExtractedKnowledge: '', knowledgeBase: [], websiteUrl: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [usersRes, analyticsRes] = await Promise.all([
        axios.get(`${API_URL}/users`),
        axios.get(`${API_URL}/analytics`)
      ]);
      setUsers(usersRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleViewDetails = async (companyId) => {
    try {
      const res = await axios.get(`${API_URL}/companies/${companyId}`);
      setSelectedCompany(res.data);
      setIsModalOpen(true);
    } catch (err) {
      alert('Failed to fetch company details');
    }
  };

  const handleEditAi = async (companyId) => {
    try {
      const res = await axios.get(`${API_URL}/companies/${companyId}/ai-config`);
      setAiConfig(res.data);
      setIsAiModalOpen(true);
    } catch (err) {
      alert('Failed to fetch AI configuration');
    }
  };

  const handleSaveAi = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/companies/${selectedCompany._id}/ai-config`, aiConfig);
      alert('Neural Core synchronized successfully! ✅');
      setIsAiModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update AI configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('CRITICAL: Delete this user and ALL associated data?')) return;
    try {
      await axios.delete(`${API_URL}/users/${userId}`);
      setUsers(users.filter(u => u._id !== userId));
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const handleBlock = async (userId) => {
    const reason = window.prompt('Enter block reason:');
    if (reason === null) return;
    try {
      await axios.post(`${API_URL}/users/${userId}/block`, { reason });
      setUsers(users.map(u => u._id === userId ? { ...u, isSuspended: true, blockReason: reason } : u));
    } catch (err) {
      alert('Failed to block user');
    }
  };

  const handleUnsuspend = async (userId) => {
    try {
      const res = await axios.put(`${API_URL}/users/${userId}/suspend`);
      setUsers(users.map(u => u._id === userId ? { ...u, isSuspended: res.data.isSuspended } : u));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="page-content">
      <div className="page-header-flex">
        <div>
          <h2>Global Command Center</h2>
          <p className="page-subtitle">Managing {users.length} active nodes across the network.</p>
        </div>
        <div className="security-badge">
          <ShieldCheck size={18} />
          <span>Encrypted Connection</span>
        </div>
      </div>
      
      {analytics && (
        <div className="stats-grid">
          <div className="stat-card premium">
            <h3>Total Users</h3>
            <p>{analytics.usersCount}</p>
            <div className="stat-glow"></div>
          </div>
          <div className="stat-card premium">
            <h3>Active Agents</h3>
            <p>{analytics.integrationsCount}</p>
            <div className="stat-glow gold"></div>
          </div>
          <div className="stat-card premium">
            <h3>AI Interactions</h3>
            <p>{analytics.totalAIMessages}</p>
            <div className="stat-glow purple"></div>
          </div>
        </div>
      )}

      <h2>User Directory</h2>
      {loading ? <div className="loader">Initializing...</div> : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Identifier</th>
                <th>Company Entity</th>
                <th>Security Status</th>
                <th>Volume</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div className="user-cell">
                      <span className="user-name-bold">{u.name || 'Anonymous'}</span>
                      <span className="user-email-sub">{u.email}</span>
                    </div>
                  </td>
                  <td>{u.companyName}</td>
                  <td>
                    <span className={`status-badge-premium ${u.isSuspended ? 'suspended' : 'active'}`}>
                      {u.isSuspended ? 'Blocked' : 'Authorized'}
                    </span>
                    {u.blockReason && <div className="block-reason-hint">{u.blockReason}</div>}
                  </td>
                  <td>{u.integrationsCount} Agents</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-icon-view" onClick={() => handleViewDetails(u.companyId)} title="View Dossier">
                        <Eye size={16} />
                      </button>
                      <button className="btn-icon ai-edit" onClick={() => {
                        setSelectedCompany({ _id: u.companyId });
                        handleEditAi(u.companyId);
                      }} title="Modify AI Configuration">
                        <BrainCircuit size={16} />
                      </button>
                      <button className="btn-icon block" onClick={() => u.isSuspended ? handleUnsuspend(u._id) : handleBlock(u._id)} title={u.isSuspended ? "Authorize User" : "Block Access"}>
                        {u.isSuspended ? <ShieldCheck size={16} /> : <ShieldX size={16} />}
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDelete(u._id)} title="Terminate Account">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Company Dossier Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Company Dossier"
      >
        {selectedCompany && selectedCompany.name && (
          <div className="company-details">
            <div className="detail-section">
              <h4>General Information</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Company Name</label>
                  <span>{selectedCompany.name}</span>
                </div>
                <div className="detail-item">
                  <label>Owner Access</label>
                  <span>{selectedCompany.ownerEmail}</span>
                </div>
                <div className="detail-item">
                  <label>Created On</label>
                  <span>{new Date(selectedCompany.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <label>Message Quota</label>
                  <span>{selectedCompany.messageLimit} / month</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>Active Integrations ({selectedCompany.integrations.length})</h4>
              {selectedCompany.integrations.length === 0 ? (
                <p className="empty-text">No active integrations found for this entity.</p>
              ) : (
                <div className="integrations-mini-list">
                  {selectedCompany.integrations.map(int => (
                    <div key={int._id} className="int-mini-card">
                      <div className={`platform-icon ${int.platform}`}>
                        {int.platform[0].toUpperCase()}
                      </div>
                      <div className="int-mini-info">
                        <span className="int-name">{int.platform}</span>
                        <span className={`int-status ${int.isActive ? 'on' : 'off'}`}>
                          {int.isActive ? 'Active' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="detail-section">
              <button className="btn-action-full" onClick={() => handleEditAi(selectedCompany._id)}>
                <BrainCircuit size={18} /> Configure AI Intelligence
              </button>
            </div>
          </div>
        )}
      </Modal>      {/* AI Configuration Modal (Clean & Stable) */}
      <Modal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        title="Neural Core Management"
        size="large"
      >
        <div className="ai-editor-modal enhanced">
          <div className="ai-editor-grid">
            
            {/* Section 1: Company Profile */}
            <div className="ai-section-box">
              <div className="section-title"><Building2 size={20} /> Identity & Profile</div>
              <div className="ai-inputs-stack">
                <div className="form-group-ai">
                  <label>Legal Entity Name</label>
                  <input type="text" value={aiConfig.name} onChange={e => setAiConfig({...aiConfig, name: e.target.value})} />
                </div>
                <div className="form-group-ai">
                  <label>Industry / Field of Operation</label>
                  <input type="text" value={aiConfig.industry} onChange={e => setAiConfig({...aiConfig, industry: e.target.value})} />
                </div>
                <div className="form-group-ai">
                  <label>Business Description & Vision</label>
                  <textarea rows="3" value={aiConfig.description} onChange={e => setAiConfig({...aiConfig, description: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Section 2: AI Configuration */}
            <div className="ai-section-box">
              <div className="section-title"><BrainCircuit size={20} /> AI Neural Settings</div>
              <div className="ai-inputs-stack">
                <div className="form-group-ai">
                  <label>System Core Instructions (System Prompt)</label>
                  <textarea rows="5" value={aiConfig.systemPrompt} onChange={e => setAiConfig({ ...aiConfig, systemPrompt: e.target.value })} />
                </div>
                <div className="form-group-ai">
                  <label>Training Data from Documents (Extracted)</label>
                  <textarea rows="6" value={aiConfig.extractedKnowledge} onChange={e => setAiConfig({ ...aiConfig, extractedKnowledge: e.target.value })} />
                </div>
                <div className="form-group-ai">
                  <label>Training Data from URLs (Scraped)</label>
                  <textarea rows="6" value={aiConfig.urlExtractedKnowledge} onChange={e => setAiConfig({ ...aiConfig, urlExtractedKnowledge: e.target.value })} />
                </div>
              </div>

              <div className="ai-training-assets">
                <div className="section-title" style={{fontSize: '0.8rem', marginBottom: '15px'}}><FileText size={16} /> Raw Training Assets</div>
                <div className="assets-grid">
                  {aiConfig.knowledgeBase.map((file, idx) => (
                    <div key={idx} className="asset-pill">
                      <FileText size={14} />
                      <span>{file.fileName || 'Document'}</span>
                    </div>
                  ))}
                  {aiConfig.websiteUrl && (
                    <div className="asset-pill url">
                      <LinkIcon size={14} />
                      <span>{aiConfig.websiteUrl}</span>
                    </div>
                  )}
                  {aiConfig.knowledgeBase.length === 0 && !aiConfig.websiteUrl && <p className="empty-text">No raw source files detected.</p>}
                </div>
              </div>
            </div>

          </div>

          <div className="ai-modal-footer">
            <button className="btn-cancel" onClick={() => setIsAiModalOpen(false)}>Discard</button>
            <button className="btn-save-ai" onClick={handleSaveAi} disabled={saving}>
              {saving ? 'Syncing...' : 'Sync Configuration'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const SupportPage = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/support-messages`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMessages(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await axios.delete(`${API_URL}/support-messages/${id}`);
      setMessages(messages.filter(m => m._id !== id));
    } catch (err) {
      alert('Failed to delete message');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await axios.put(`${API_URL}/support-messages/${id}/read`);
      setMessages(messages.map(m => m._id === id ? { ...m, status: 'read' } : m));
    } catch (err) {
      alert('Failed to update message');
    }
  };

  return (
    <div className="page-content">
      <h2>Inbound Intelligence</h2>
      <p className="page-subtitle">Monitoring encrypted communications from external nodes.</p>
      
      {loading ? <div className="loader">Scanning...</div> : (
        <div className="messages-grid">
          {messages.length === 0 ? (
            <div className="empty-state">
              <Mail size={48} className="icon-dim" />
              <p>Buffer is empty. No incoming messages.</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg._id} className={`message-card-premium ${msg.status === 'read' ? 'read' : 'unread'}`}>
                <div className="message-header">
                  <div className="user-meta">
                    <h4>{msg.name}</h4>
                    <span>{msg.email}</span>
                  </div>
                  <div className="message-date">
                    <Clock size={14} />
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="message-body-premium">
                  <div className="subject-line">RE: {msg.subject}</div>
                  <p>{msg.message}</p>
                </div>
                <div className="message-footer-premium">
                  <div className="status-group">
                    <span className="status-label">{msg.status === 'read' ? 'ARCHIVED' : 'PENDING'}</span>
                    {msg.status !== 'read' && (
                      <button className="btn-action-small" onClick={() => handleMarkRead(msg._id)}>
                        <CheckCircle2 size={14} /> Archive
                      </button>
                    )}
                  </div>
                  <div className="action-group">
                    <button className="btn-icon-danger" onClick={() => handleDelete(msg._id)}>
                      <Trash2 size={16} />
                    </button>
                    <a href={`mailto:${msg.email}`} className="btn-reply-premium">Reply</a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const BroadcastPage = () => {
  const [message, setMessage] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [type, setType] = useState('info');
  const [loading, setLoading] = useState(false);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/broadcast`, { message, active: isActive, type });
      alert('System-wide transmission updated.');
    } catch (err) {
      alert('Transmission failure.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <h2>Global Transmission</h2>
      <div className="broadcast-editor-premium">
        <p className="editor-info">Injecting a system-wide announcement into all user nodes.</p>
        <form onSubmit={handleBroadcast}>
          <div className="form-group">
            <label>Transmission Payload</label>
            <textarea 
              rows="4" 
              placeholder="Enter system announcement..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Alert Protocol</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="info">Standard Protocol (Info)</option>
                <option value="warning">Elevated Alert (Warning)</option>
                <option value="success">Clearance (Success)</option>
              </select>
            </div>
            
            <div className="form-group-checkbox">
              <input type="checkbox" id="active-check" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <label htmlFor="active-check">Enable Transmission</label>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="btn-broadcast-execute">
            {loading ? 'Transmitting...' : 'Execute Transmission'}
          </button>
        </form>
      </div>
      
      <div className="preview-section-premium">
        <h3>Live Signal Monitor</h3>
        {isActive && message ? (
          <div className={`broadcast-preview-premium protocol-${type}`}>
            <Megaphone size={18} className="pulse-icon" />
            <div className="preview-text">
              <span className="protocol-label">[{type.toUpperCase()}]</span>
              <span>{message}</span>
            </div>
          </div>
        ) : (
          <div className="no-signal">No active signal detected.</div>
        )}
      </div>
    </div>
  );
};

const AgentsPage = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    try {
      const res = await axios.get(`${API_URL}/agents`);
      setAgents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAgents(); }, []);

  return (
    <div className="page-content">
      <h2>Integrated Nodes</h2>
      <p className="page-subtitle">Monitoring active platform integrations across all entities.</p>
      {loading ? <div className="loader">Scanning Network...</div> : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Status</th>
                <th>Entity Name</th>
                <th>Operator</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(a => (
                <tr key={a._id}>
                  <td className="platform-cell">
                    <span className={`platform-tag ${a.platform}`}>{a.platform}</span>
                  </td>
                  <td>
                    <div className="status-flex">
                      <div className={`status-dot-small ${a.isActive ? 'online' : 'offline'}`}></div>
                      <span>{a.isActive ? 'Online' : 'Disconnected'}</span>
                    </div>
                  </td>
                  <td>{a.companyName}</td>
                  <td>{a.ownerEmail}</td>
                  <td>
                    <button className="btn-icon-danger" onClick={() => {}} title="Terminate Integration"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const MainLayout = ({ children, setAuth }) => (
  <div className="dashboard-layout">
    <Sidebar setAuth={setAuth} />
    <div className="main-area">
      <div className="security-top-bar">
        <div className="encryption-indicator">
          <div className="lock-icon"><ShieldCheck size={14} /></div>
          <span>End-to-End Encrypted Session</span>
        </div>
        <div className="session-timer">
          Session Active
        </div>
      </div>
      {children}
    </div>
  </div>
);

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('adminToken'));

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login setAuth={setIsAuthenticated} />} />
        {isAuthenticated ? (
          <>
            <Route path="/" element={<MainLayout setAuth={setIsAuthenticated}><UsersPage /></MainLayout>} />
            <Route path="/agents" element={<MainLayout setAuth={setIsAuthenticated}><AgentsPage /></MainLayout>} />
            <Route path="/support" element={<MainLayout setAuth={setIsAuthenticated}><SupportPage /></MainLayout>} />
            <Route path="/broadcast" element={<MainLayout setAuth={setIsAuthenticated}><BroadcastPage /></MainLayout>} />
          </>
        ) : (
          <Route path="*" element={<Login setAuth={setIsAuthenticated} />} />
        )}
      </Routes>
    </Router>
  );
};

export default App;
