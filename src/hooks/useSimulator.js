import { useState, useMemo, useCallback } from 'react';
import { computeSimulation } from '../utils/calculations';

const INITIAL_SIM = {
  ctr: 1.5,
  cvr: 6,
  cpc: 1.2,
  ticket: 100,
  margin: 25,
  impressions: 50000
};

export function useSimulator(baseResults) {
  const [params, setParams] = useState(INITIAL_SIM);

  const sim = useMemo(() => computeSimulation(params), [params]);

  const deltas = useMemo(() => {
    if (!baseResults || !baseResults.impressions) return null;
    return {
      clicks: sim.clicks - baseResults.clicks,
      sales: sim.sales - baseResults.sales,
      spend: sim.spend - baseResults.adSpend,
      rev: sim.rev - baseResults.revenue,
      roas: sim.roas - baseResults.roas,
      acos: sim.acos - baseResults.acos,
      profit: sim.profit - baseResults.lucroLiquido,
      marOp: sim.marOp - baseResults.margemOp
    };
  }, [sim, baseResults]);

  const setParam = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  }, []);

  const syncFromCalculator = useCallback((results) => {
    if (!results || !results.impressions) return;
    setParams({
      ctr: Math.min(10, results.ctr || 1.5),
      cvr: Math.min(30, results.cvr || 6),
      cpc: Math.min(10, results.cpc || 1.2),
      ticket: Math.min(2000, results.ticket || 100),
      margin: Math.min(80, results.margin || 25),
      impressions: Math.min(500000, results.impressions || 50000)
    });
  }, []);

  return { params, setParam, sim, deltas, syncFromCalculator };
}
