import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import StitchSlider from '../components/StitchSlider';
import { fmtBRL, fmtPct, fmtNum } from '../utils/formatters';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const MULT = [0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0, 1.25, 1.5, 1.75, 2.0];
const CUR_IDX = 6;

function buildProjection(roas, spend, margin) {
  return MULT.map(m => {
    const r = roas * m;
    const rev = r * spend;
    const profit = rev * (margin / 100) - spend;
    return { m, roas: r, rev, profit, spend };
  });
}

const SCENARIO_KEYS = [
  { idx: 2,       label: '−50%' },
  { idx: 4,       label: '−25%' },
  { idx: CUR_IDX, label: 'Atual' },
  { idx: 8,       label: '+50%' },
  { idx: 10,      label: '+100%' },
];

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

  const projection = useMemo(
    () => buildProjection(s.roas, s.spend, params.margin),
    [s.roas, s.spend, params.margin]
  );

  const breakEvenRoas = params.margin > 0 ? 100 / params.margin : 0;

  const chartData = useMemo(() => ({
    labels: projection.map(p => `${p.roas.toFixed(2)}x`),
    datasets: [
      {
        label: 'Receita',
        data: projection.map(p => Math.round(p.rev)),
        borderColor: '#3483FA',
        backgroundColor: 'rgba(52,131,250,0.06)',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: MULT.map((_, i) => i === CUR_IDX ? 7 : 3),
        pointBackgroundColor: MULT.map((_, i) => i === CUR_IDX ? '#FFE600' : '#3483FA'),
        pointBorderColor: MULT.map((_, i) => i === CUR_IDX ? '#FFE600' : '#3483FA'),
        pointBorderWidth: MULT.map((_, i) => i === CUR_IDX ? 2 : 1),
      },
      {
        label: 'Lucro',
        data: projection.map(p => Math.round(p.profit)),
        tension: 0.4,
        borderWidth: 2,
        pointRadius: MULT.map((_, i) => i === CUR_IDX ? 7 : 3),
        pointBackgroundColor: projection.map((p, i) =>
          i === CUR_IDX ? '#FFE600' : p.profit >= 0 ? '#34D399' : '#FF8A80'
        ),
        pointBorderColor: projection.map((p, i) =>
          i === CUR_IDX ? '#FFE600' : p.profit >= 0 ? '#34D399' : '#FF8A80'
        ),
        segment: {
          borderColor: ctx => ctx.p0.parsed.y < 0 ? '#FF8A80' : '#34D399',
        },
        fill: false,
      },
      {
        label: 'Investimento',
        data: projection.map(p => Math.round(p.spend)),
        borderColor: 'rgba(100,116,139,0.5)',
        borderDash: [6, 4],
        borderWidth: 1.5,
        tension: 0,
        pointRadius: 0,
        fill: false,
      },
    ],
  }), [projection]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94A3B8',
          font: { family: 'Manrope', size: 12 },
          boxWidth: 24,
          boxHeight: 2,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#1A2233',
        borderColor: '#2D3748',
        borderWidth: 1,
        titleColor: '#E8E2CF',
        bodyColor: '#94A3B8',
        titleFont: { family: 'Manrope', size: 13 },
        bodyFont: { family: 'Manrope', size: 12 },
        padding: 12,
        callbacks: {
          title: items => `ROAS: ${items[0].label}`,
          label: ctx => ` ${ctx.dataset.label}: ${fmtBRL(ctx.raw)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(45,55,72,0.4)', drawTicks: false },
        border: { color: 'rgba(45,55,72,0.4)' },
        ticks: { color: '#64748B', font: { size: 11, family: 'Manrope' } },
        title: {
          display: true,
          text: 'ROAS',
          color: '#64748B',
          font: { size: 11, family: 'Manrope' },
        },
      },
      y: {
        grid: { color: 'rgba(45,55,72,0.4)', drawTicks: false },
        border: { color: 'rgba(45,55,72,0.4)' },
        ticks: {
          color: '#64748B',
          font: { size: 11, family: 'Manrope' },
          callback: v => fmtBRL(v),
        },
      },
    },
  }), []);

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

      {/* Projection Chart */}
      <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">
            <span className="material-symbols-outlined">show_chart</span>
            Projeção de ROAS
          </span>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 'var(--space-lg)' }}>
            <span>
              Break-even:&nbsp;
              <strong style={{ color: 'var(--warning)' }}>{fmtNum(breakEvenRoas, 2)}x</strong>
            </span>
            <span>
              ROAS atual:&nbsp;
              <strong style={{ color: 'var(--primary)' }}>{fmtNum(s.roas, 2)}x</strong>
            </span>
          </div>
        </div>

        <div style={{ height: 300, marginBottom: 'var(--space-xl)' }}>
          {s.spend > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Ajuste os parâmetros para visualizar a projeção
            </div>
          )}
        </div>

        {/* Scenarios comparison */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 'var(--space-md)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Cenários de variação de ROAS (investimento fixo)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-sm)' }}>
            {SCENARIO_KEYS.map(({ idx, label }) => {
              const p = projection[idx];
              const isCurrent = idx === CUR_IDX;
              const isProfit = p.profit >= 0;
              return (
                <div
                  key={idx}
                  style={{
                    background: isCurrent ? 'var(--primary-glow)' : 'var(--bg-elevated)',
                    border: `1px solid ${isCurrent ? 'rgba(255,230,0,0.3)' : 'var(--border-tonal)'}`,
                    borderRadius: 'var(--radius)',
                    padding: 'var(--space-md)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 10, color: isCurrent ? 'var(--primary)' : 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    {isCurrent ? '★ Atual' : `ROAS ${label}`}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: isCurrent ? 'var(--primary)' : 'var(--text-primary)', marginBottom: 6 }}>
                    {fmtNum(p.roas, 2)}x
                  </div>
                  <div style={{ fontSize: 11, color: '#3483FA', marginBottom: 3 }}>
                    {fmtBRL(p.rev)}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isProfit ? 'var(--success)' : 'var(--error)' }}>
                    {fmtBRL(p.profit)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                    {isProfit ? 'lucro' : 'prejuízo'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
