import { useMemo } from 'react';
import { generateDiagnostics, generateActionPlan, classify, computeHealthScore, healthLabel } from '../utils/calculations';
import { fmtPct } from '../utils/formatters';

export default function DiagnosticoView({ results: r, ok, benchmarks: b, bench }) {
  const diagnostics = useMemo(() => {
    if (!ok) return [];
    return generateDiagnostics(r);
  }, [ok, r]);

  const actionPlan = useMemo(() => {
    if (!ok) return [];
    return generateActionPlan(r, bench);
  }, [ok, r, bench]);

  const healthScore = useMemo(() => {
    if (!ok || !b.ctr || !b.cvr || !b.roas) return 0;
    return computeHealthScore(b.ctr, b.cvr, b.roas);
  }, [ok, b]);

  const healthLbl = healthLabel(healthScore);

  const healthColor = healthScore >= 80 ? 'var(--success)'
    : healthScore >= 60 ? 'var(--badge-good)'
    : healthScore >= 40 ? 'var(--warning)'
    : 'var(--error)';

  // Ring gauge SVG
  const ringSize = 140;
  const ringStroke = 10;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringOffset = ringCirc - (healthScore / 100) * ringCirc;

  const priorityLabels = { high: 'Alta', med: 'Média', low: 'Baixa' };
  const priorityColors = { high: 'var(--error)', med: 'var(--warning)', low: 'var(--info)' };

  if (!ok) {
    return (
      <div>
        <h2 className="view-title">Diagnóstico</h2>
        <p className="view-subtitle">Insights automatizados sobre sua campanha</p>
        <div className="empty-state" style={{ padding: '80px 0' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 64 }}>monitoring</span>
          <h3 style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Sem dados para diagnosticar</h3>
          <p style={{ marginTop: 8 }}>Preencha os dados na aba <strong>Calculadora</strong> primeiro</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="view-title">Diagnóstico</h2>
      <p className="view-subtitle">Análise inteligente da performance da sua campanha</p>

      {/* Health Score + Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
        {/* Ring Gauge */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-xl)' }}>
          <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={ringSize/2} cy={ringSize/2} r={ringRadius}
              stroke="var(--border-tonal)" strokeWidth={ringStroke} fill="none" />
            <circle cx={ringSize/2} cy={ringSize/2} r={ringRadius}
              stroke={healthColor} strokeWidth={ringStroke} fill="none"
              strokeDasharray={ringCirc} strokeDashoffset={ringOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
          </svg>
          <div style={{ textAlign: 'center', marginTop: '-90px', position: 'relative' }}>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-kpi)', color: healthColor }}>
              {healthScore}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {healthLbl}
            </div>
          </div>
          <div style={{ height: 50 }} />
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
            Saúde da Campanha
          </div>
        </div>

        {/* Metric Bars */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <span className="material-symbols-outlined">speed</span>
              Métricas-chave
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-base)' }}>
            {[
              { label: 'CTR', value: r.ctr, fmt: fmtPct(r.ctr), badge: b.ctr, max: 5 },
              { label: 'CVR', value: r.cvr, fmt: fmtPct(r.cvr), badge: b.cvr, max: 10 },
              { label: 'ROAS', value: r.roas, fmt: `${r.roas.toFixed(2)}x`, badge: b.roas, max: r.breakEven ? r.breakEven * 3 : 10 },
              { label: 'ACoS', value: r.acos, fmt: fmtPct(r.acos), badge: b.acos, max: r.margin > 0 ? r.margin * 2 : 50 },
              { label: 'Margem Op.', value: Math.max(0, r.margemOp), fmt: fmtPct(r.margemOp), badge: b.margemOp, max: 30 }
            ].map((m, i) => {
              const pct = Math.min(100, Math.max(0, (m.value / m.max) * 100));
              const barColor = m.badge?.class === 'great' ? 'var(--success)'
                : m.badge?.class === 'good' ? 'var(--badge-good)'
                : m.badge?.class === 'weak' ? 'var(--warning)'
                : 'var(--error)';

              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{m.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-kpi)', color: 'var(--text-primary)' }}>{m.fmt}</span>
                      {m.badge && m.badge.label !== '—' && (
                        <span className={`badge badge-${m.badge.class}`}>{m.badge.label}</span>
                      )}
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Diagnostics */}
      <h3 className="section-title">
        <span className="material-symbols-outlined">fact_check</span>
        Diagnósticos Automáticos
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
        {diagnostics.map((d, i) => (
          <div key={i} className={`diag-item ${d.level}`}>
            <div className="diag-icon">{d.icon}</div>
            <div className="diag-body">
              <h4>{d.title}</h4>
              <p>{d.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Plan */}
      <h3 className="section-title">
        <span className="material-symbols-outlined">checklist</span>
        Plano de Ação
      </h3>
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {actionPlan.map((a, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-md)',
              padding: 'var(--space-sm) var(--space-base)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: `color-mix(in srgb, ${priorityColors[a.p]} 15%, transparent)`,
                color: priorityColors[a.p],
                whiteSpace: 'nowrap',
                marginTop: 2
              }}>
                {priorityLabels[a.p]}
              </span>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{a.t}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
