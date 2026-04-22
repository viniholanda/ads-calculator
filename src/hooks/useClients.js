import { useState, useCallback, useEffect } from 'react';
import { loadClients, saveClients, getActiveClientId, setActiveClientId, initClients, genId } from '../utils/storage';

export function useClients() {
  const [clients, setClients] = useState([]);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const { clients: c, activeId: a } = initClients();
    setClients(c);
    setActiveId(a);
  }, []);

  const refresh = useCallback(() => {
    setClients(loadClients());
    setActiveId(getActiveClientId());
  }, []);

  const switchClient = useCallback((id) => {
    setActiveClientId(id);
    setActiveId(id);
  }, []);

  const addClient = useCallback((name) => {
    const list = loadClients();
    const id = genId();
    list.push({ id, name: name.trim(), createdAt: new Date().toISOString() });
    saveClients(list);
    setActiveClientId(id);
    setClients(list);
    setActiveId(id);
    return id;
  }, []);

  const renameClient = useCallback((id, name) => {
    const list = loadClients();
    const c = list.find(x => x.id === id);
    if (c) { c.name = name.trim(); saveClients(list); setClients([...list]); }
  }, []);

  const deleteClient = useCallback((id) => {
    let list = loadClients();
    if (list.length <= 1) return false;
    list = list.filter(c => c.id !== id);
    saveClients(list);
    localStorage.removeItem(`ml_ads_scenarios_${id}`);
    localStorage.removeItem(`ml_ads_benchmarks_${id}`);
    if (getActiveClientId() === id) {
      setActiveClientId(list[0].id);
      setActiveId(list[0].id);
    }
    setClients(list);
    return true;
  }, []);

  return { clients, activeId, switchClient, addClient, renameClient, deleteClient, refresh };
}
