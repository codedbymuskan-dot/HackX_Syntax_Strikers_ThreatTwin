import { useSimulation } from '../context/SimulationContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function BlastRadiusOverlay() {
  const { blastRadiusMode, blastRadius, blastRadiusOrigin, nodeMap } = useSimulation();

  if (!blastRadiusMode) return null;

  return (
    <AnimatePresence>
      {blastRadiusMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="blast-overlay"
        >
          <div className="blast-mode-indicator">
            <div className="blast-pulse-ring" />
            <span>BLAST RADIUS MODE</span>
            <span className="blast-hint">Click any node to see its reach</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
