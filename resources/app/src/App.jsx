import { SimulationProvider } from './context/SimulationContext';
import { AuthProvider } from './context/AuthContext';
import TopBar from './components/TopBar';
import GraphView from './components/GraphView';
import Sidebar from './components/Sidebar';
import ResultsPanel from './components/ResultsPanel';
import ControlPanel from './components/ControlPanel';
import BlastRadiusOverlay from './components/BlastRadiusOverlay';
import AuthModal from './components/AuthModal';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/globals.css';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SimulationProvider>
          <div className="app-shell">
            <TopBar />
            <div className="app-body">
              <Sidebar />
              <div className="app-main">
                <GraphView />
                <BlastRadiusOverlay />
              </div>
              <div className="app-right">
                <ResultsPanel />
                <ControlPanel />
              </div>
            </div>
            <AuthModal />
          </div>
        </SimulationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
