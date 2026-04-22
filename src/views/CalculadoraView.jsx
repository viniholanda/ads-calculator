import { useState, useMemo, useRef, useEffect } from 'react';
import SunkenInput from '../components/SunkenInput';
import KpiCard from '../components/KpiCard';
import { fmtBRL, fmtPct, fmtNum } from '../utils/formatters';
import { classify } from '../utils/calculations';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const INPUT_FIELDS = [
  { key: 'margin',       label: 'Margem (%)',           suffix: '%',  placeholder: '25' },
  { key: 'impressions',  label: 'Impressões',           placeholder: '50000' },
  { key: 'clicks',       label: 'Cliques',              placeholder: '750' },
  { key: 'sales',        label: 'Vendas (Ads)',          placeholder: '45' },
  { key: 'revenue',      label: 'Receita Ads (R$)',     prefix: 'R$', placeholder: '4500' },
  { key: 'totalRevenue', label: 'Receita Total (R$)',   prefix: 'R$', placeholder: '18000' },
  { key: 'adSpend',      label: 'Investimento Ads (R$)', prefix: 'R$', placeholder: '900' }
];

export default function CalculadoraView({ calc, scenarios, onSave }) {
  const { inputs, setField, results: r, ok, benchmarks: b, loadExample, resetInputs } = calc;
  const [saveName, setSaveName] = useState('');
  const [saveAdjustments, setSaveAdjustments] = useState('');
  const [showSaved, setShowSaved] = useState(false);

  const bCpa = useMemo(() => {
    if (!ok) return { label: '—', class: '' };
    const beCpa = r.ticket * (r.margin / 100);
    if (beCpa <= 0 || r.cpa <= 0) return { label: '—', class: '' };
    if (r.cpa > beCpa) return { label: 'Ruim', class: 'bad' };
    if (r.cpa > beCpa * 0.8) return { label: 'Fraco', class: 'weak' };
    if (r.cpa > beCpa * 0.5) return { label: 'Bom', class: 'good' };
    return { label: 'Ótimo', class: 'great' };
  }, [ok, r]);

  const bLucro = useMemo(() => {
    if (!ok) return { label: '—', class: '' };
    return r.lucroLiquido > 0 ? { label: 'Lucro', class: 'great' } : { label: 'Prejuízo', class: 'bad' };
  }, [ok, r]);

  const bBreakEven = useMemo(() => {
    if (!ok || r.roas <= 0) return { label: '—', class: '' };
    return r.roas >= r.breakEven ? { label: 'Acima', class: 'great' } : { label: 'Abaixo', class: 'bad' };
  }, [ok, r]);

  const none = { label: '—', class: '' };

  const handleSave = () => {
    if (!saveName.trim()) return;
    onSave(saveName.trim(), saveAdjustments.trim());
    setSaveName('');
    setSaveAdjustments('');
  };

  // Doughnut chart data
  const doughnutData = useMemo(() => {
    if (!ok || !r.revenue || r.revenue <= 0) return null;
    const ad = r.adSpend || 0;
    const lucroBruto = r.lucroBruto || 0;
    const custoProduto = Math.max(0, r.revenue - lucroBruto);
    const isLoss = r.lucroLiquido < 0;
    const lucroSlice = Math.max(0, r.lucroLiquido);
    const prejSlice = Math.max(0, -r.lucroLiquido);

    return {
      labels: isLoss
        ? ['Custos / Taxas', 'Investimento Ads', 'Prejuízo Líquido']
        : ['Custos / Taxas', 'Investimento Ads', 'Lucro Líquido'],
      datasets: [{
        data: isLoss
          ? [custoProduto, ad, prejSlice]
          : [custoProduto, ad, lucroSlice],
        backgroundColor: isLoss
          ? ['#ff9f43', '#3483fa', '#ff5e5e']
          : ['#ff9f43', '#3483fa', '#27c47a'],
        borderColor: '#1A2233',
        borderWidth: 3,
        hoverOffset: 8
      }]
    };
  }, [ok, r]);

  const doughnutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#ffffff',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 14,
          font: { family: 'Manrope, sans-serif', size: 12, weight: '600' }
        }
      },
      tooltip: {
        callbacks: {
          label: (c) => {
            const rev = r.revenue || 1;
            const pct = ((c.raw / rev) * 100).toFixed(1);
            return ` ${fmtBRL(c.raw)}  (${pct}% da receita)`;
          }
        }
      }
    }
  }), [r]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
        <div>
          <h2 className="view-title">Calculadora de Performance</h2>
          <p className="view-subtitle">Insira os dados da sua campanha para análise completa dos KPIs</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost" onClick={loadExample}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>science</span>
            Exemplo
          </button>
          <button className="btn btn-ghost" onClick={resetInputs}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>restart_alt</span>
            Limpar
          </button>
        </div>
      </div>

      {/* Input Form */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <span className="card-title">
            <span className="material-symbols-outlined">edit_note</span>
            Dados da Campanha
          </span>
        </div>
        <div className="input-form-grid">
          {INPUT_FIELDS.map(f => (
            <SunkenInput
              key={f.key}
              id={`input-${f.key}`}
              label={f.label}
              value={inputs[f.key]}
              onChange={(v) => setField(f.key, v)}
              placeholder={f.placeholder}
              prefix={f.prefix}
              suffix={f.suffix}
            />
          ))}
        </div>
      </div>

      {/* KPI Grid — Performance */}
      {ok && (
        <>
          <h3 className="section-title">
            <span className="material-symbols-outlined">insights</span>
            KPIs de Performance
          </h3>
          <div className="kpi-grid" style={{ marginBottom: 'var(--space-xl)' }}>
            <KpiCard label="CTR" value={r.ctr} format="pct" badge={b.ctr} icon="ads_click" formula="cliques / impressões" />
            <KpiCard label="CVR" value={r.cvr} format="pct" badge={b.cvr} icon="shopping_cart" formula="vendas / cliques" />
            <KpiCard label="ROAS" value={r.roas} format="roas" badge={b.roas} icon="trending_up" formula="receita / investimento" />
            <KpiCard label="ACoS" value={r.acos} format="pct" badge={b.acos} icon="percent" formula="investimento / receita" />
            <KpiCard label="TACoS" value={r.tacos} format="pct" badge={b.tacos} icon="analytics" formula="ads / receita total" />
            <KpiCard label="CPA" value={r.cpa} format="brl" badge={bCpa} icon="payments" formula="investimento / vendas" />
          </div>

          <h3 className="section-title">
            <span className="material-symbols-outlined">account_balance</span>
            KPIs Financeiros
          </h3>
          <div className="kpi-grid" style={{ marginBottom: 'var(--space-xl)' }}>
            <KpiCard label="Lucro Líquido" value={r.lucroLiquido} format="brl" badge={bLucro} icon="savings" />
            <KpiCard label="Margem Op." value={r.margemOp} format="pct" badge={b.margemOp} icon="donut_small" />
            <KpiCard label="Break-Even" value={r.breakEven} format="roas" badge={bBreakEven} icon="balance" formula="1 / margem" />
            <KpiCard label="CPC" value={r.cpc} format="brl" badge={none} icon="touch_app" formula="investimento / cliques" />
            <KpiCard label="Ticket Médio" value={r.ticket} format="brl" badge={none} icon="receipt_long" formula="receita / vendas" />
            <KpiCard label="Lucro Bruto" value={r.lucroBruto} format="brl" badge={none} icon="account_balance_wallet" />
          </div>

          {/* Chart + Save */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
            {/* Doughnut */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <span className="material-symbols-outlined">pie_chart</span>
                  Distribuição Financeira
                </span>
              </div>
              <div className="chart-container" style={{ height: 280 }}>
                {doughnutData && <Doughnut data={doughnutData} options={doughnutOptions} />}
              </div>
            </div>

            {/* Save Scenario */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <span className="material-symbols-outlined">bookmark</span>
                  Salvar Cenário
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-sm)' }}>
                <input
                  type="text"
                  className="sunken-input"
                  placeholder="Nome do cenário..."
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
                <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
              </div>
              <textarea
                className="sunken-input"
                placeholder="Ajustes feitos na campanha (ex: aumentei lance em 20%, pausei SKUs ruins, troquei criativo...)"
                value={saveAdjustments}
                onChange={e => setSaveAdjustments(e.target.value)}
                rows={3}
                style={{ width: '100%', resize: 'vertical', marginBottom: 'var(--space-base)', fontFamily: 'inherit' }}
              />

              {/* Saved List */}
              <button
                className="btn btn-ghost"
                style={{ width: '100%', marginBottom: 'var(--space-md)' }}
                onClick={() => setShowSaved(p => !p)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  {showSaved ? 'expand_less' : 'expand_more'}
                </span>
                {scenarios.scenarios.length} cenário(s) salvo(s)
              </button>

              {showSaved && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: 300, overflowY: 'auto' }}>
                  {scenarios.scenarios.length === 0 ? (
                    <div className="empty-state">
                      <span className="material-symbols-outlined">bookmark_border</span>
                      Nenhum cenário salvo ainda
                    </div>
                  ) : (
                    scenarios.scenarios.map((s, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                            ROAS {fmtNum(s.r?.roas || 0, 2)}x · Lucro {fmtBRL(s.r?.lucroLiquido || 0)}
                          </div>
                          {s.adjustments && (
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 12, verticalAlign: 'middle', marginRight: 4 }}>tune</span>
                              {s.adjustments}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => calc.loadFromScenario(s)}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>upload</span>
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11, color: 'var(--error)' }}
                            onClick={() => scenarios.remove(i)}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!ok && (
        <div className="empty-state" style={{ padding: '80px 0' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 64 }}>calculate</span>
          <h3 style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Preencha os dados da campanha</h3>
          <p style={{ marginTop: 8 }}>
            Insira ao menos um dado acima ou clique em <strong>"Exemplo"</strong> para começar
          </p>
        </div>
      )}
    </div>
  );
}
