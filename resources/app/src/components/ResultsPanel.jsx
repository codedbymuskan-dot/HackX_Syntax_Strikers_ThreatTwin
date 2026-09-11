import { useSimulation } from '../context/SimulationContext';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt';

const RISK_LABELS = {
  0: { label: 'None', color: '#64748b' },
  1: { label: 'Low', color: '#3b82f6' },
  3: { label: 'Low', color: '#3b82f6' },
  6: { label: 'Medium', color: '#f59e0b' },
  10: { label: 'High', color: '#f97316' },
};

function getRiskBadge(score) {
  if (score >= 20) return { label: 'Critical', color: '#ef4444' };
  if (score >= 12) return { label: 'High', color: '#f97316' };
  if (score >= 6) return { label: 'Medium', color: '#f59e0b' };
  if (score >= 1) return { label: 'Low', color: '#3b82f6' };
  return { label: 'None', color: '#64748b' };
}

export default function ResultsPanel() {
  const {
    attackPaths,
    simulationRun,
    highlightedPathIndex,
    setHighlightedPathIndex,
    showPath,
    previousPathCount,
    nodeMap,
    network,
  } = useSimulation();

  if (!simulationRun) return null;

  // Feature 6: Plain-English hop narrative generator
  const getHopNarrative = (fromId, toId) => {
    const from = nodeMap[fromId];
    const to = nodeMap[toId];
    if (!from || !to) return '';
    const edge = network.edges.find(
      (e) =>
        (e.source === fromId && e.target === toId) ||
        (e.source === toId && e.target === fromId)
    );
    const rel = edge?.relationship;
    if (rel === 'shared-credentials') {
      return `Moves from ${from.label} to ${to.label} via shared credentials.`;
    }
    if (rel === 'trust-relationship') {
      return `Traverses bilateral trust relationship between ${from.label} and ${to.label}.`;
    }
    if (rel === 'admin-access') {
      return `Leverages administrative jump access to compromise ${to.label}.`;
    }
    if (rel === 'api-access') {
      return `Invokes privileged API tokens from ${from.label} into ${to.label}.`;
    }
    if (rel === 'network-access') {
      return `Moves laterally across local network from ${from.label} to reach ${to.label}.`;
    }
    return `Traverses from ${from.label} to ${to.label}.`;
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="results-panel glass-panel"
    >
      <div className="results-header">
        <div>
          <h2 className="results-title">Attack Chains</h2>
          <div className="results-meta">
            <span className="results-count">{attackPaths.length} paths found</span>
            {previousPathCount !== null && (
              <span
                className="results-delta"
                style={{
                  color:
                    attackPaths.length < previousPathCount
                      ? '#22c55e'
                      : attackPaths.length > previousPathCount
                      ? '#ef4444'
                      : '#38bdf8',
                }}
              >
                {previousPathCount} → {attackPaths.length}
              </span>
            )}
          </div>
        </div>

        {/* Feature 2: Multi-Path Overlay Toggle */}
        {attackPaths.length > 1 && (
          <button
            className={`btn-multi-overlay ${highlightedPathIndex === -1 ? 'btn-multi-active' : ''}`}
            onClick={() => setHighlightedPathIndex(highlightedPathIndex === -1 ? 0 : -1)}
            title="Toggle simultaneously overlaying top 2-3 paths on graph vs single path"
          >
            {highlightedPathIndex === -1 ? '✦ Multi-Path ON' : 'Show Top 3'}
          </button>
        )}
      </div>

      {attackPaths.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="results-empty"
        >
          <div className="results-empty-icon">🛡️</div>
          <p>No attack paths found. The network is secure from this foothold under active defenses.</p>
        </motion.div>
      )}

      <div className="results-list">
        <AnimatePresence>
          {attackPaths.map((chain, index) => {
            const badge = getRiskBadge(chain.riskScore);
            const isIsolated = highlightedPathIndex === index;
            const isPartOfMulti = highlightedPathIndex === -1 && index < 3;

            return (
              <motion.div
                key={`${chain.targetId}-${index}`}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08, duration: 0.3 }}
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
                    className={`result-card ${isIsolated ? 'result-card-active' : ''} ${
                      isPartOfMulti ? 'result-card-multi' : ''
                    }`}
                    onClick={() => showPath(index)}
                  >
                    <div className="result-card-header">
                      <span className="result-target">
                        <span className="rank-indicator">#{index + 1}</span> {chain.targetLabel}
                      </span>
                      <span
                        className="result-badge"
                        style={{
                          backgroundColor: badge.color + '20',
                          color: badge.color,
                          borderColor: badge.color + '40',
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div className="result-card-stats">
                      <div className="result-stat">
                        <span className="stat-value">{chain.hopCount}</span>
                        <span className="stat-label">hops</span>
                      </div>
                      <div className="result-stat">
                        <span className="stat-value">{chain.riskScore}</span>
                        <span className="stat-label">risk score</span>
                      </div>
                      <button
                        className={`btn-path-toggle ${isIsolated ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          showPath(index);
                        }}
                      >
                        {isIsolated ? '✓ Isolated' : 'Show on graph'}
                      </button>
                    </div>

                    {/* Node path sequence */}
                    <div className="result-path-preview">
                      {chain.path.map((nodeId, i) => (
                        <span key={nodeId} className="path-node">
                          {i > 0 && <span className="path-arrow">→</span>}
                          <span className="path-node-label" title={nodeMap[nodeId]?.label}>
                            {nodeMap[nodeId]?.label || nodeId}
                          </span>
                        </span>
                      ))}
                    </div>

                    {/* Feature 6: Plain-English Hop Narration */}
                    <div className="hop-narrative-box">
                      <div className="hop-narrative-title">Attack Progression:</div>
                      {chain.path.slice(0, chain.path.length - 1).map((currId, i) => (
                        <div key={i} className="hop-narrative-step">
                          <span className="step-num">{i + 1}.</span> {getHopNarrative(currId, chain.path[i + 1])}
                        </div>
                      ))}
                    </div>
                  </div>
                </Tilt>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
