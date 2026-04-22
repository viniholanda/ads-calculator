import { useState, useCallback } from 'react';
import { loadScenarios, saveScenarios } from '../utils/storage';
import { compute } from '../utils/calculations';

export function useScenarios(activeClientId) {
  const [scenarios, setScenarios] = useState(() => loadScenarios(activeClientId));
  const [scenarioName, setScenarioName] = useState('');

  const refresh = useCallback(() => {
    setScenarios(loadScenarios(activeClientId));
  }, [activeClientId]);

  const save = useCallback((name, input) => {
    const r = compute(input);
    const list = loadScenarios(activeClientId);
    list.push({ name, input, r, date: new Date().toISOString() });
    saveScenarios(list, activeClientId);
    refresh();
    return true;
  }, [activeClientId, refresh]);

  const update = useCallback((index, name, input) => {
    const r = compute(input);
    const list = loadScenarios(activeClientId);
    list[index] = { name, input, r, date: new Date().toISOString() };
    saveScenarios(list, activeClientId);
    refresh();
    return true;
  }, [activeClientId, refresh]);

  const remove = useCallback((index) => {
    const list = loadScenarios(activeClientId);
    list.splice(index, 1);
    saveScenarios(list, activeClientId);
    refresh();
  }, [activeClientId, refresh]);

  return {
    scenarios,
    scenarioName,
    setScenarioName,
    save,
    update,
    remove,
    refresh
  };
}
