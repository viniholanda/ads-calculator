import StitchSlider from '../components/StitchSlider';
import KpiCard from '../components/KpiCard';
import { fmtBRL, fmtPct, fmtNum } from '../utils/formatters';

export default function SimuladorView({ sim, baseResults }) {
  const { params, setParam, sim: s, deltas } = sim;

  const DeltaChip = ({ value, format = 'num', invert = false }) => {
    if (!deltas || value === undefined || value === null) return null;
    const pos = invert ? value < 0 : value > 0;
    let display;
    if (format === 'brl') display = fmtBRL(Math.abs(value));
    else if (format === 'pct') display = fmtPct(Math.abs(value), 2);
    else if (format === 'roas') display = fmtNum(Math.abs(value), 2) + 'x';
    else display = fmtNum(Math.abs(value));

    return (
      <span className={`delta ${pos ? 'pos' : 'neg'}`}>
        {pos ? '▲' : '▼'} {display}
      </span>
    );
  };

  return (
    <div>
      <h2 className="view-title">Simulador de Cenários</h2>
      <p className="view-subtitle">Ajuste os parâmetros para projetar resultados hipotéticos</p>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 'var(--space-xl)' }}>
        {/* Sliders */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <span className="material-symbols-outlined">tune</span>
              Parâmetros
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <StitchSlider
              label="Impressões"
              value={params.impressions}
              onChange={v => setParam('impressions', v)}
              min={1000} max={500000} step={1000}
              displayValue={fmtNum(params.impressions)}
            />
            <StitchSlider
              label="CTR"
              value={params.ctr}
              onChange={v => setParam('ctr', v)}
              min={0.1} max={10} step={0.01}
              displayValue={fmtPct(params.ctr)}
            />
            <StitchSlider
              label="CVR"
              value={params.cvr}
              onChange={v => setParam('cvr', v)}
              min={0.1} max={30} step={0.01}
              displayValue={fmtPct(params.cvr)}
            />
            <StitchSlider
              label="CPC"
              value={params.cpc}
              onChange={v => setParam('cpc', v)}
              min={0.1} max={10} step={0.05}
              displayValue={fmtBRL(params.cpc)}
            />
            <StitchSlider
              label="Ticket Médio"
              value={params.ticket}
              onChange={v => setParam('ticket', v)}
              min={10} max={2000} step={5}
              displayValue={fmtBRL(params.ticket)}
            />
            <StitchSlider
              label="Margem"
              value={params.margin}
              onChange={v => setParam('margin', v)}
              min={1} max={80} step={0.5}
              unit="%"
            />
          </div>

          {baseResults && (
            <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-base)', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                className="btn btn-ghost"
                style={{ width: '100%' }}
                onClick={() => sim.syncFromCalculator(baseResults)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sync</span>
                Sincronizar com Calculadora
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          <div className="kpi-grid" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="kpi-card">
              <div className="kpi-label">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>ads_click</span>
                Cliques Projetados
              </div>
              <div className="kpi-value">{fmtNum(s.clicks)}</div>
              {deltas && <DeltaChip value={deltas.clicks} />}
            </div>

            <div className="kpi-card">
              <div className="kpi-label">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>shopping_cart</span>
                Vendas Projetadas
              </div>
              <div className="kpi-value">{fmtNum(s.sales)}</div>
              {deltas && <DeltaChip value={deltas.sales} />}
            </div>

            <div className="kpi-card">
              <div className="kpi-label">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>payments</span>
                Investimento
              </div>
              <div className="kpi-value">{fmtBRL(s.spend)}</div>
              {deltas && <DeltaChip value={deltas.spend} format="brl" invert />}
            </div>

            <div className="kpi-card">
              <div className="kpi-label">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>attach_money</span>
                Receita Projetada
              </div>
              <div className="kpi-value">{fmtBRL(s.rev)}</div>
              {deltas && <DeltaChip value={deltas.rev} format="brl" />}
            </div>

            <div className="kpi-card">
              <div className="kpi-label">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>trending_up</span>
                ROAS
              </div>
              <div className="kpi-value">{fmtNum(s.roas, 2)}x</div>
              {deltas && <DeltaChip value={deltas.roas} format="roas" />}
            </div>

            <div className="kpi-card">
              <div className="kpi-label">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>percent</span>
                ACoS
              </div>
              <div className="kpi-value">{fmtPct(s.acos)}</div>
              {deltas && <DeltaChip value={deltas.acos} format="pct" invert />}
            </div>

            <div className="kpi-card" style={{
              borderColor: s.profit >= 0 ? 'var(--success-border)' : 'var(--error-border)',
              background: s.profit >= 0 ? 'var(--success-bg)' : 'var(--error-bg)'
            }}>
              <div className="kpi-label">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: s.profit >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {s.profit >= 0 ? 'savings' : 'money_off'}
                </span>
                {s.profit >= 0 ? 'Lucro Projetado' : 'Prejuízo Projetado'}
              </div>
              <div className="kpi-value" style={{ color: s.profit >= 0 ? 'var(--success)' : 'var(--error)' }}>
                {fmtBRL(s.profit)}
              </div>
              {deltas && <DeltaChip value={deltas.profit} format="brl" />}
            </div>

            <div className="kpi-card">
              <div className="kpi-label">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>donut_small</span>
                Margem Op.
              </div>
              <div className="kpi-value">{fmtPct(s.marOp)}</div>
              {deltas && <DeltaChip value={deltas.marOp} format="pct" />}
            </div>
          </div>

          {/* Verdict */}
          <div className="card" style={{
            borderColor: s.profit >= 0 ? 'var(--success-border)' : 'var(--error-border)',
            borderLeft: `4px solid ${s.profit >= 0 ? 'var(--success)' : 'var(--error)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <span style={{ fontSize: 32 }}>
                {s.roas >= 4 ? '🚀' : s.profit >= 0 ? '✅' : '⚠️'}
              </span>
              <div>
                <h4 style={{ marginBottom: 4 }}>
                  {s.roas >= 4 ? 'Excelente oportunidade de escala!'
                    : s.profit >= 0 ? 'Cenário lucrativo'
                    : 'Cenário em prejuízo'}
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {s.roas >= 4
                    ? `Com ROAS de ${fmtNum(s.roas, 2)}x e margem operacional de ${fmtPct(s.marOp)}, este cenário tem ampla margem para escalar o investimento.`
                    : s.profit >= 0
                    ? `O lucro projetado é ${fmtBRL(s.profit)} com ROAS de ${fmtNum(s.roas, 2)}x. Há espaço para otimização.`
                    : `Cada venda gera prejuízo. Ajuste CPC, margem ou CVR para atingir o equilíbrio.`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
