import { useState, useCallback, useEffect } from 'react';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { loadScenarios, saveScenarios } from '../utils/storage';
import { compute } from '../utils/calculations';

// ── Supabase helpers ──
async function dbLoad(mentoradoId) {
  const { data, error } = await supabase
    .from('scenarios')
    .select('*')
    .eq('mentorado_id', mentoradoId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map(r => ({ id: r.id, name: r.name, input: r.input, r: r.results, adjustments: r.adjustments || '', date: r.created_at }));
}

async function dbSave(mentoradoId, name, input, results, adjustments) {
  const { data, error } = await supabase.from('scenarios').insert({
    mentorado_id: mentoradoId,
    name,
    input,
    results,
    adjustments: adjustments || '',
  }).select().single();
  if (error) throw error;
  return { id: data.id, name: data.name, input: data.input, r: data.results, adjustments: data.adjustments, date: data.created_at };
}

async function dbUpdate(id, name, input, results, adjustments) {
  const { error } = await supabase.from('scenarios').update({
    name,
    input,
    results,
    adjustments: adjustments || '',
  }).eq('id', id);
  if (error) throw error;
}

async function dbUpdateAdjustments(id, adjustments) {
  const { error } = await supabase.from('scenarios').update({ adjustments }).eq('id', id);
  if (error) throw error;
}

async function dbDelete(id) {
  const { error } = await supabase.from('scenarios').delete().eq('id', id);
  if (error) throw error;
}

// ── Hook ──
export function useScenarios(activeClientId) {
  const [scenarios, setScenarios] = useState([]);
  const [scenarioName, setScenarioName] = useState('');

  const refresh = useCallback(async () => {
    if (!activeClientId) return;
    if (!isSupabaseReady) {
      setScenarios(loadScenarios(activeClientId));
      return;
    }
    try {
      const list = await dbLoad(activeClientId);
      setScenarios(list);
    } catch (e) {
      console.error('useScenarios refresh:', e);
    }
  }, [activeClientId]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(async (name, input, adjustments = '') => {
    const r = compute(input);
    if (!isSupabaseReady) {
      const list = loadScenarios(activeClientId);
      list.push({ name, input, r, adjustments, date: new Date().toISOString() });
      saveScenarios(list, activeClientId);
      setScenarios([...list]);
      return true;
    }
    try {
      const s = await dbSave(activeClientId, name, input, r, adjustments);
      setScenarios(prev => [...prev, s]);
      return true;
    } catch (e) {
      console.error('useScenarios save:', e);
      return false;
    }
  }, [activeClientId]);

  const update = useCallback(async (index, name, input, adjustments = '') => {
    const r = compute(input);
    if (!isSupabaseReady) {
      const list = loadScenarios(activeClientId);
      list[index] = { ...list[index], name, input, r, adjustments, date: new Date().toISOString() };
      saveScenarios(list, activeClientId);
      setScenarios([...list]);
      return true;
    }
    try {
      const s = scenarios[index];
      if (!s?.id) return false;
      await dbUpdate(s.id, name, input, r, adjustments);
      setScenarios(prev => prev.map((x, i) => i === index ? { ...x, name, input, r, adjustments } : x));
      return true;
    } catch (e) {
      console.error('useScenarios update:', e);
      return false;
    }
  }, [activeClientId, scenarios]);

  const updateAdjustments = useCallback(async (index, adjustments) => {
    if (!isSupabaseReady) {
      const list = loadScenarios(activeClientId);
      if (!list[index]) return false;
      list[index] = { ...list[index], adjustments };
      saveScenarios(list, activeClientId);
      setScenarios([...list]);
      return true;
    }
    try {
      const s = scenarios[index];
      if (!s?.id) return false;
      await dbUpdateAdjustments(s.id, adjustments);
      setScenarios(prev => prev.map((x, i) => i === index ? { ...x, adjustments } : x));
      return true;
    } catch (e) {
      console.error('useScenarios updateAdjustments:', e);
      return false;
    }
  }, [activeClientId, scenarios]);

  const remove = useCallback(async (index) => {
    if (!isSupabaseReady) {
      const list = loadScenarios(activeClientId);
      list.splice(index, 1);
      saveScenarios(list, activeClientId);
      setScenarios([...list]);
      return;
    }
    try {
      const s = scenarios[index];
      if (!s?.id) return;
      await dbDelete(s.id);
      setScenarios(prev => prev.filter((_, i) => i !== index));
    } catch (e) {
      console.error('useScenarios remove:', e);
    }
  }, [activeClientId, scenarios]);

  return { scenarios, scenarioName, setScenarioName, save, update, updateAdjustments, remove, refresh };
}
