import { useState, useCallback, useEffect } from 'react';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { loadClients, saveClients, getActiveClientId, setActiveClientId, initClients, genId } from '../utils/storage';

// ── Supabase helpers ──
async function dbLoadClients() {
  const { data, error } = await supabase.from('mentorados').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data.map(r => ({ id: r.id, name: r.name, email: r.email, storeUrl: r.store_url, niche: r.niche, notes: r.notes, createdAt: r.created_at }));
}

async function dbAddClient(fields) {
  const { data, error } = await supabase.from('mentorados').insert({
    name: fields.name,
    email: fields.email || null,
    store_url: fields.storeUrl || null,
    niche: fields.niche || null,
    notes: fields.notes || null,
  }).select().single();
  if (error) throw error;
  return { id: data.id, name: data.name, email: data.email, storeUrl: data.store_url, niche: data.niche, notes: data.notes, createdAt: data.created_at };
}

async function dbUpdateClient(id, fields) {
  const { error } = await supabase.from('mentorados').update({
    name: fields.name,
    email: fields.email ?? undefined,
    store_url: fields.storeUrl ?? undefined,
    niche: fields.niche ?? undefined,
    notes: fields.notes ?? undefined,
  }).eq('id', id);
  if (error) throw error;
}

async function dbDeleteClient(id) {
  const { error } = await supabase.from('mentorados').delete().eq('id', id);
  if (error) throw error;
}

// ── Hook ──
export function useClients() {
  const [clients, setClients] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const restoreActive = useCallback((list, currentActive) => {
    const stored = currentActive || getActiveClientId();
    if (list.length === 0) return;
    const valid = list.find(c => c.id === stored);
    const id = valid ? stored : list[0].id;
    setActiveClientId(id);
    setActiveId(id);
  }, []);

  const refresh = useCallback(async () => {
    if (!isSupabaseReady) {
      const { clients: c, activeId: a } = initClients();
      setClients(c);
      setActiveId(a);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const list = await dbLoadClients();
      setClients(list);
      restoreActive(list, activeId);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeId, restoreActive]);

  useEffect(() => {
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchClient = useCallback((id) => {
    setActiveClientId(id);
    setActiveId(id);
  }, []);

  const addClient = useCallback(async (name, extra = {}) => {
    if (!isSupabaseReady) {
      const list = loadClients();
      const id = genId();
      list.push({ id, name: name.trim(), createdAt: new Date().toISOString() });
      saveClients(list);
      setActiveClientId(id);
      setClients(list);
      setActiveId(id);
      return id;
    }
    try {
      const client = await dbAddClient({ name: name.trim(), ...extra });
      setClients(prev => [...prev, client]);
      setActiveClientId(client.id);
      setActiveId(client.id);
      return client.id;
    } catch (e) {
      setError(e.message);
      return null;
    }
  }, []);

  const updateClient = useCallback(async (id, fields) => {
    if (!isSupabaseReady) {
      const list = loadClients();
      const c = list.find(x => x.id === id);
      if (c) { Object.assign(c, fields); saveClients(list); setClients([...list]); }
      return;
    }
    try {
      await dbUpdateClient(id, fields);
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const renameClient = useCallback((id, name) => updateClient(id, { name: name.trim() }), [updateClient]);

  const deleteClient = useCallback(async (id) => {
    if (clients.length <= 1) return false;
    if (!isSupabaseReady) {
      let list = loadClients().filter(c => c.id !== id);
      saveClients(list);
      localStorage.removeItem(`ml_ads_scenarios_${id}`);
      localStorage.removeItem(`ml_ads_benchmarks_${id}`);
      localStorage.removeItem(`ml_ads_sim_params_${id}`);
      localStorage.removeItem(`ml_ads_calc_inputs_${id}`);
      if (getActiveClientId() === id) {
        setActiveClientId(list[0].id);
        setActiveId(list[0].id);
      }
      setClients(list);
      return true;
    }
    try {
      await dbDeleteClient(id);
      const list = clients.filter(c => c.id !== id);
      setClients(list);
      if (activeId === id) {
        const next = list[0]?.id || '';
        setActiveClientId(next);
        setActiveId(next);
      }
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }, [clients, activeId]);

  return { clients, activeId, loading, error, switchClient, addClient, updateClient, renameClient, deleteClient, refresh };
}
