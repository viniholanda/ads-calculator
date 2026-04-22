import { useState, useCallback } from 'react';
import { useClients } from './hooks/useClients';
import { useCalculator } from './hooks/useCalculator';
import { useScenarios } from './hooks/useScenarios';
import { useSimulator } from './hooks/useSimulator';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import CalculadoraView from './views/CalculadoraView';
import DiagnosticoView from './views/DiagnosticoView';
import SimuladorView from './views/SimuladorView';
import CompararView from './views/CompararView';

const VIEWS = [
  { id: 'calculadora', label: 'Calculadora', icon: 'calculate' },
  { id: 'diagnostico', label: 'Diagnóstico', icon: 'monitoring' },
  { id: 'simulador',   label: 'Simulador',   icon: 'tune' },
  { id: 'comparar',    label: 'Comparar',    icon: 'compare_arrows' }
];

export default function App() {
  const [activeView, setActiveView] = useState('calculadora');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const clientsHook = useClients();
  const calcHook = useCalculator(clientsHook.activeId);
  const scenariosHook = useScenarios(clientsHook.activeId);
  const simHook = useSimulator(calcHook.ok ? calcHook.results : null);

  const handleSaveScenario = useCallback((name) => {
    if (!name.trim()) return false;
    return scenariosHook.save(name, calcHook.numericInputs);
  }, [scenariosHook, calcHook.numericInputs]);

  const renderView = () => {
    switch (activeView) {
      case 'calculadora':
        return (
          <CalculadoraView
            calc={calcHook}
            scenarios={scenariosHook}
            onSave={handleSaveScenario}
          />
        );
      case 'diagnostico':
        return (
          <DiagnosticoView
            results={calcHook.results}
            ok={calcHook.ok}
            benchmarks={calcHook.benchmarks}
            bench={calcHook.bench}
          />
        );
      case 'simulador':
        return (
          <SimuladorView
            sim={simHook}
            baseResults={calcHook.ok ? calcHook.results : null}
          />
        );
      case 'comparar':
        return (
          <CompararView
            scenarios={scenariosHook.scenarios}
            currentResults={calcHook.ok ? calcHook.results : null}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        views={VIEWS}
        activeView={activeView}
        onViewChange={setActiveView}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(p => !p)}
      />
      <main className={`app-main ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        <Header
          clients={clientsHook}
          activeViewLabel={VIEWS.find(v => v.id === activeView)?.label || ''}
          onMenuToggle={() => setSidebarOpen(p => !p)}
        />
        <div className="app-content animate-fade-in" key={activeView}>
          {renderView()}
        </div>
      </main>
    </div>
  );
}
