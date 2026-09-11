import { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { useAuth } from '../context/AuthContext';
import { exportIncidentReport } from '../utils/reportExporter';
import { motion, AnimatePresence } from 'framer-motion';

export default function TopBar() {
  const { currentUser, logout, setIsAuthModalOpen } = useAuth();
  const {
    network,
    selectedScenario,
    selectScenario,
    runSimulation,
    resetSimulation,
    footholdNodeId,
    simulationRun,
    attackPaths,
    activeControls,
    securityScore,
    appliedDrifts,
    lastDriftMessage,
    triggerEnvironmentDrift,
    blastRadiusMode,
    toggleBlastRadiusMode,
  } = useSimulation();

  const [driftNotification, setDriftNotification] = useState(false);

  const handleDriftClick = () => {
    triggerEnvironmentDrift();
    setDriftNotification(true);
    setTimeout(() => setDriftNotification(false), 3500);
  };

  const handleExportPDF = () => {
    exportIncidentReport({
      selectedScenario,
      footholdNodeId,
      attackPaths,
      activeControls,
      securityScore,
      network,
      appliedDrifts,
    });
  };

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="topbar"
    >
      <div className="topbar-left">
        <div className="topbar-logo">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#14b8a6" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="logo-text">THREAT<span className="logo-accent">TWIN</span></span>
        </div>

        {/* Feature 1: Prominent Security Posture Score */}
        <div
          className="posture-score-badge"
          title="Network Security Posture Score (0–100): Increases as active controls eliminate lateral attack vectors across the digital twin."
        >
          <div
            className="score-ring"
            style={{
              borderColor: securityScore.color,
              boxShadow: `0 0 12px ${securityScore.color}40`,
            }}
          >
            <span className="score-num" style={{ color: securityScore.color }}>
              {securityScore.score}
            </span>
          </div>
          <div className="score-info">
            <span className="score-label">SECURITY POSTURE</span>
            <span className="score-status" style={{ color: securityScore.color }}>
              {securityScore.status}
            </span>
          </div>
        </div>
      </div>

      <div className="topbar-center">
        <div className="scenario-selector">
          <label className="scenario-label">SCENARIO</label>
          <select
            className="scenario-dropdown"
            value={selectedScenario?.id || ''}
            onChange={(e) => selectScenario(e.target.value)}
          >
            <option value="">— Select Scenario —</option>
            {network.scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
            {selectedScenario && !network.scenarios.find((s) => s.id === selectedScenario.id) && (
              <option value={selectedScenario.id}>Custom: {selectedScenario.label}</option>
            )}
          </select>
        </div>

        <button
          className="btn btn-primary"
          onClick={runSimulation}
          disabled={!footholdNodeId}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
          Run Simulation
        </button>

        <button
          className="btn btn-secondary"
          onClick={resetSimulation}
          disabled={!simulationRun}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          Reset
        </button>
      </div>

      <div className="topbar-right">
        {/* Feature 4: Simulate Environment Drift */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-drift"
            onClick={handleDriftClick}
            title="Simulate continuous synchronization by injecting unmanaged infrastructure drift"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            Simulate Drift ({appliedDrifts.length}/4)
          </button>

          <AnimatePresence>
            {driftNotification && lastDriftMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                className="drift-toast"
              >
                <div className="drift-toast-title">⚡ {lastDriftMessage.title}</div>
                <div className="drift-toast-text">{lastDriftMessage.text}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Feature 3: Downloadable Incident Report */}
        <button
          className="btn btn-export"
          onClick={handleExportPDF}
          title="Export offline client-side incident assessment report (PDF)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export Report
        </button>

        {/* Blast Radius Toggle (Bug 2 clean transition) */}
        <button
          className={`btn btn-blast ${blastRadiusMode ? 'btn-blast-active' : ''}`}
          onClick={toggleBlastRadiusMode}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          Blast Radius {blastRadiusMode ? 'ON' : 'OFF'}
        </button>

        {/* Enterprise Authentication & User Profile */}
        <div className="user-profile-badge">
          {currentUser ? (
            <div className="user-profile-inner">
              <span className="user-avatar">{currentUser.avatar || '👤'}</span>
              <div className="user-details">
                <span className="user-name">{currentUser.name}</span>
                <span className="user-role">{currentUser.role}</span>
              </div>
              <button
                className="btn-user-logout"
                onClick={logout}
                title="Sign out of ThreatTwin digital twin"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => setIsAuthModalOpen(true)}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
