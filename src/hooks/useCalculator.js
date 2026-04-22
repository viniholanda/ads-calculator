import { useState, useCallback, useMemo } from 'react';
import { compute, hasData, classify, buildAllBench, defaultThresholds } from '../utils/calculations';
import { loadThresholds, saveThresholds } from '../utils/storage';

const INITIAL_INPUTS = {
  margin: '',
  impressions: '',
  clicks: '',
  sales: '',
  revenue: '',
  totalRevenue: '',
  adSpend: ''
};

const EXAMPLE_INPUTS = {
  margin: 25,
  impressions: 50000,
  clicks: 750,
  sales: 45,
  revenue: 4500,
  totalRevenue: 18000,
  adSpend: 900
};

export function useCalculator(activeClientId) {
  const [inputs, setInputs] = useState(INITIAL_INPUTS);

  const thresholds = useMemo(() => {
    return loadThresholds(activeClientId, defaultThresholds);
  }, [activeClientId]);

  const bench = useMemo(() => buildAllBench(thresholds), [thresholds]);

  const numericInputs = useMemo(() => ({
    margin: parseFloat(inputs.margin) || 0,
    impressions: parseFloat(inputs.impressions) || 0,
    clicks: parseFloat(inputs.clicks) || 0,
    sales: parseFloat(inputs.sales) || 0,
    revenue: parseFloat(inputs.revenue) || 0,
    totalRevenue: parseFloat(inputs.totalRevenue) || 0,
    adSpend: parseFloat(inputs.adSpend) || 0
  }), [inputs]);

  const results = useMemo(() => compute(numericInputs), [numericInputs]);
  const ok = useMemo(() => hasData(results), [results]);

  const benchmarks = useMemo(() => {
    if (!ok) return {};
    return {
      ctr:   classify('ctr',   results.ctr,   null,          bench),
      cvr:   classify('cvr',   results.cvr,   null,          bench),
      roas:  classify('roas',  results.roas,  results.margin, bench),
      acos:  classify('acos',  results.acos,  results.margin, bench),
      tacos: classify('tacos', results.tacos, results.margin, bench),
      margemOp: classify('margemOp', results.margemOp, null, bench),
    };
  }, [ok, results, bench]);

  const setField = useCallback((field, value) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  }, []);

  const loadExample = useCallback(() => {
    setInputs(EXAMPLE_INPUTS);
  }, []);

  const resetInputs = useCallback(() => {
    setInputs(INITIAL_INPUTS);
  }, []);

  const loadFromScenario = useCallback((scenario) => {
    setInputs({
      margin:       scenario.input.margin       || '',
      impressions:  scenario.input.impressions  || '',
      clicks:       scenario.input.clicks       || '',
      sales:        scenario.input.sales        || '',
      revenue:      scenario.input.revenue      || '',
      totalRevenue: scenario.input.totalRevenue || '',
      adSpend:      scenario.input.adSpend      || ''
    });
  }, []);

  return {
    inputs,
    setField,
    results,
    ok,
    benchmarks,
    bench,
    thresholds,
    loadExample,
    resetInputs,
    loadFromScenario,
    numericInputs
  };
}
