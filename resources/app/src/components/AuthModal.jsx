import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthModal() {
  const { currentUser, login, register, isAuthModalOpen, setIsAuthModalOpen } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Security Analyst');
  const [company, setCompany] = useState('Nexus Cyber Systems');
  const [error, setError] = useState(null);

  // If user is not logged in, force open modal
  const isOpen = isAuthModalOpen || !currentUser;

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (isRegisterMode) {
        register({ name, email, password, role, company });
      } else {
        login(email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fillQuickDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsRegisterMode(false);
    setError(null);
  };

  return (
    <div className="auth-overlay">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="auth-modal glass-panel"
      >
        <div className="auth-header">
          <div className="auth-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#14b8a6" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            <span className="auth-title">THREAT<span className="logo-accent">TWIN</span></span>
          </div>
          {currentUser && (
            <button className="auth-close-btn" onClick={() => setIsAuthModalOpen(false)}>
              ?
            </button>
          )}
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${!isRegisterMode ? 'active' : ''}`}
            onClick={() => {
              setIsRegisterMode(false);
              setError(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${isRegisterMode ? 'active' : ''}`}
            onClick={() => {
              setIsRegisterMode(true);
              setError(null);
            }}
          >
            Create Account
          </button>
        </div>

        {error && <div className="auth-error-banner">?? {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegisterMode && (
            <div className="auth-field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="e.g. Alex Vance"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label>Enterprise Email</label>
            <input
              type="email"
              placeholder="e.g. analyst@threattwin.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              placeholder=""
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {isRegisterMode && (
            <>
              <div className="auth-field">
                <label>Organizational Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="Security Analyst">Security Analyst</option>
                  <option value="SOC Lead">SOC Lead / Incident Commander</option>
                  <option value="CISO & Architect">CISO & Principal Architect</option>
                  <option value="Red Team Operator">Red Team Operator</option>
                  <option value="Compliance Auditor">Compliance Auditor</option>
                </select>
              </div>
              <div className="auth-field">
                <label>Company / Organization</label>
                <input
                  type="text"
                  placeholder="e.g. Nexus Cyber Systems"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary auth-submit-btn">
            {isRegisterMode ? 'Complete Registration' : 'Authenticate to Digital Twin'}
          </button>
        </form>

        {/* Demo Quick Fill Shortcuts */}
        {!isRegisterMode && (
          <div className="auth-demo-shortcuts">
            <span className="auth-demo-label">Quick Demo Access:</span>
            <div className="auth-demo-buttons">
              <button
                type="button"
                className="btn-demo-pill"
                onClick={() => fillQuickDemo('analyst@threattwin.io', 'password123')}
              >
                ?? SOC Analyst
              </button>
              <button
                type="button"
                className="btn-demo-pill"
                onClick={() => fillQuickDemo('admin@threattwin.io', 'adminpassword')}
              >
                ??? Enterprise CISO
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
