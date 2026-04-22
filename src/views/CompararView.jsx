import { useMemo } from 'react';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { fmtBRL, fmtPct, fmtNum } from '../utils/formatters';
import { compute, classify } from '../utils/calculations';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function CompararView({ scenarios, results: currentR, ok: currentOk }) {
  // Only keep scenarios with enough data
  const validScenarios = useMemo(() => {
    return (scenarios || []).filter(s => s && s.input && s.input.impressions > 0);
  }, [scenarios]);

  const computedScenarios = useMemo(() => {
    return validScenarios.map(s => {
      const r = compute(s.input);
      return { ...s, results: r, data: s.input };
    });
  }, [validScenarios]);

  // Radar chart data
  const radarData = useMemo(() => {
    if (computedScenarios.length === 0) return null;
    const colors = [
      { bg: 'rgba(99,102,241,0.15)', border: '#6366f1' },
      { bg: 'rgba(16,185,129,0.15)', border: '#10b981' },
      { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b' },
      { bg: 'rgba(239,68,68,0.15)', border: '#ef4444' },
      { bg: 'rgba(168,85,247,0.15)', border: '#a855f7' },
    ];

    // Normalize helper
    const maxes = { ctr: 0, cvr: 0, roas: 0 };
    computedScenarios.forEach(s => {
      if (s.results.ctr > maxes.ctr) maxes.ctr = s.results.ctr;
      if (s.results.cvr > maxes.cvr) maxes.cvr = s.results.cvr;
      if (s.results.roas > maxes.roas) maxes.roas = s.results.roas;
    });

    return {
      labels: ['CTR', 'CVR', 'ROAS', 'Margem Op.', 'ACoS (inv)'],
      datasets: computedScenarios.slice(0, 5).map((s, i) => {
        const c = colors[i % colors.length];
        const acosInv = Math.max(0, 100 - (s.results.acos || 0));
        return {
          label: s.name || `Cenário ${i + 1}`,
          data: [
            maxes.ctr > 0 ? (s.results.ctr / maxes.ctr) * 100 : 0,
            maxes.cvr > 0 ? (s.results.cvr / maxes.cvr) * 100 : 0,
            maxes.roas > 0 ? (s.results.roas / maxes.roas) * 100 : 0,
            Math.max(0, s.results.margemOp),
            acosInv,
          ],
          backgroundColor: c.bg,
          borderColor: c.border,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        };
      }),
    };
  }, [computedScenarios]);

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: 'rgba(255,255,255,0.06)' },
        grid: { color: 'rgba(255,255,255,0.06)' },
        pointLabels: { color: '#ffffff', font: { family: 'Manrope', size: 11, weight: '600' } },
        ticks: { display: false },
        suggestedMin: 0,
        suggestedMax: 100,
      },
    },
    plugins: {
      legend: {
        labels: { color: '#ffffff', font: { family: 'Manrope', size: 12 }, usePointStyle: true, pointStyle: 'circle' },
      },
      tooltip: {
        backgroundColor: 'var(--bg-surface)',
        titleColor: 'var(--text-primary)',
        bodyColor: 'var(--text-secondary)',
        borderColor: 'var(--border-tonal)',
        borderWidth: 1,
      },
    },
  };

  if (computedScenarios.length < 2) {
    return (
      <div>
        <h2 className="view-title">Comparar Cenários</h2>
        <p className="view-subtitle">Análise comparativa entre cenários salvos</p>
        <div className="empty-state" style={{ padding: '80px 0' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 64 }}>compare</span>
          <h3 style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Poucos cenários para comparar</h3>
          <p style={{ marginTop: 8 }}>Salve pelo menos <strong>2 cenários</strong> na aba Calculadora</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="view-title">Comparar Cenários</h2>
      <p className="view-subtitle">Análise lado a lado dos cenários salvos</p>

      {/* Radar Chart */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <span className="card-title">
            <span className="material-symbols-outlined">radar</span>
            Radar Comparativo
          </span>
        </div>
        <div style={{ height: 340 }}>
          {radarData && <Radar data={radarData} options={radarOptions} />}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <div className="card-header">
          <span className="card-title">
            <span className="material-symbols-outlined">table_chart</span>
            Tabela Comparativa
          </span>
        </div>
        <table className="compare-table">
          <thead>
            <tr>
              <th>Métrica</th>
              {computedScenarios.map((s, i) => (
                <th key={i}>{s.name || `Cenário ${i + 1}`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Impressões', key: 'impressions', fmt: v => fmtNum(v), src: 'data' },
              { label: 'Cliques', key: 'clicks', fmt: v => fmtNum(v), src: 'data' },
              { label: 'CTR', key: 'ctr', fmt: v => fmtPct(v) },
              { label: 'Vendas', key: 'sales', fmt: v => fmtNum(v), src: 'data' },
              { label: 'CVR', key: 'cvr', fmt: v => fmtPct(v) },
              { label: 'Custo Total', key: 'adSpend', fmt: v => fmtBRL(v), src: 'data' },
              { label: 'Receita', key: 'revenue', fmt: v => fmtBRL(v), src: 'data' },
              { label: 'ROAS', key: 'roas', fmt: v => `${fmtNum(v, 2)}x` },
              { label: 'ACoS', key: 'acos', fmt: v => fmtPct(v) },
              { label: 'Lucro/Prejuízo', key: 'lucroLiquido', fmt: v => fmtBRL(v), highlight: true },
              { label: 'Margem Op.', key: 'margemOp', fmt: v => fmtPct(v) },
            ].map((row, ri) => {
              // Find "best" scenario for this metric
              let bestIdx = 0;
              let bestVal = -Infinity;
              const inverted = ['acos', 'adSpend'];
              computedScenarios.forEach((s, i) => {
                const v = row.src === 'data' ? s.data[row.key] : s.results[row.key];
                const compare = inverted.includes(row.key) ? -v : v;
                if (compare > bestVal) { bestVal = compare; bestIdx = i; }
              });

              return (
                <tr key={ri}>
                  <td style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-muted)' }}>{row.label}</td>
                  {computedScenarios.map((s, i) => {
                    const v = row.src === 'data' ? s.data[row.key] : s.results[row.key];
                    const isBest = computedScenarios.length > 1 && i === bestIdx;
                    return (
                      <td key={i} style={{
                        fontFamily: 'var(--font-kpi)',
                        fontWeight: 600,
                        fontSize: 13,
                        color: row.highlight
                          ? (v >= 0 ? 'var(--success)' : 'var(--error)')
                          : isBest ? 'var(--primary)' : 'var(--text-primary)'
                      }}>
                        {row.fmt(v || 0)}
                        {isBest && <span style={{ fontSize: 10, marginLeft: 6 }}>⭐</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
