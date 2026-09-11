import { useSimulation } from '../context/SimulationContext';
import { motion } from 'framer-motion';
import Tilt from 'react-parallax-tilt';

const CONTROLS = [
  {
    id: 'mfa-admin-server',
    label: 'Add MFA on Admin Server',
    description: 'Requires multi-factor auth for all admin-access connections to the admin server, blocking direct privilege escalation.',
    icon: '🔐',
  },
  {
    id: 'segment-network',
    label: 'Segment Network',
    description: 'Isolates endpoint devices from server infrastructure, blocking lateral movement via network-access.',
    icon: '🧱',
  },
  {
    id: 'revoke-shared-admin',
    label: 'Revoke Shared Admin Credentials',
    description: 'Removes shared credential links from admin-privileged accounts, eliminating credential-based lateral movement.',
    icon: '🔑',
  },
];

export default function ControlPanel() {
  const {
    activeControls,
    toggleControl,
    simulationRun,
    attackPaths,
    previousPathCount,
  } = useSimulation();

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.4 }}
      className="control-panel glass-panel"
    >
      <div className="control-header">
        <h2 className="control-title">Security Controls</h2>
        <span className="control-subtitle">Toggle hypothetical fixes</span>
      </div>

      {/* Before/After indicator (Bug 3 Fix: renders reliably on all controls) */}
      {simulationRun && previousPathCount !== null && (
        <motion.div
          key={`impact-${previousPathCount}-${attackPaths.length}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="control-impact"
        >
          <div className="impact-before">
            <span className="impact-number">{previousPathCount}</span>
            <span className="impact-label">paths before</span>
          </div>
          <span className="impact-arrow">→</span>
          <div className="impact-after">
            <span
              className="impact-number"
              style={{
                color:
                  attackPaths.length < previousPathCount
                    ? '#22c55e'
                    : attackPaths.length > previousPathCount
                    ? '#ef4444'
                    : '#38bdf8',
              }}
            >
              {attackPaths.length}
            </span>
            <span className="impact-label">
              {attackPaths.length === previousPathCount ? 'paths (re-ranked)' : 'paths after'}
            </span>
          </div>
        </motion.div>
      )}

      <div className="control-list">
        {CONTROLS.map((control, index) => {
          const isActive = activeControls.includes(control.id);
          return (
            <motion.div
              key={control.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <Tilt
                tiltMaxAngleX={4}
                tiltMaxAngleY={4}
                glareEnable={true}
                glareMaxOpacity={0.06}
                glarePosition="all"
                scale={1.01}
              >
                <div
                  className={`control-card ${isActive ? 'control-active' : ''}`}
                  onClick={() => toggleControl(control.id)}
                >
                  <div className="control-card-left">
                    <span className="control-icon">{control.icon}</span>
                    <div className="control-info">
                      <span className="control-name">{control.label}</span>
                      <span className="control-desc">{control.description}</span>
                    </div>
                  </div>
                  <div className={`toggle-switch ${isActive ? 'toggle-on' : ''}`}>
                    <div className="toggle-knob" />
                  </div>
                </div>
              </Tilt>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
