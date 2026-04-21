// ====== Calculadora Mercado Livre Ads ======

const $ = (q) => document.querySelector(q);
const $$ = (q) => document.querySelectorAll(q);

const fmtBRL = (v) => {
  if (!isFinite(v) || isNaN(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
const fmtNum = (v, d = 0) => {
  if (!isFinite(v) || isNaN(v)) return '0';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
};
const fmtPct = (v, d = 2) => {
  if (!isFinite(v) || isNaN(v)) return '0%';
  return `${v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
};

// ===== Benchmarks =====
// CTR e CVR: editáveis, baseados em dados típicos Mercado Livre Ads
// ROAS e ACoS: derivados da margem (não editáveis)
// Defaults alinhados a benchmarks típicos ML Ads 2025/2026 (sellers pequenos/médios).
// CTR: < 0,5 ruim · 0,5–1 fraco · 1–2 bom · > 2 ótimo
// CVR: < 1 ruim · 1–1,5 fraco · 1,5–3 bom · > 3 ótimo
const BENCH_META = {
  ctr: { title: 'CTR', unit: '%', direction: 'higher', defaults: [0.5, 1, 2] },
  cvr: { title: 'CVR', unit: '%', direction: 'higher', defaults: [1, 1.5, 3] }
};
// ===== Multi-cliente — chaves dinâmicas por cliente =====
const CLIENTS_KEY      = 'ml_ads_clients_v1';
const ACTIVE_CLIENT_KEY = 'ml_ads_active_client';
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function benchKey()     { return `ml_ads_benchmarks_${localStorage.getItem(ACTIVE_CLIENT_KEY)}`; }
function scenariosKey() { return `ml_ads_scenarios_${localStorage.getItem(ACTIVE_CLIENT_KEY)}`; }

function buildBench(thresholds, direction) {
  const [t1, t2, t3] = thresholds;
  if (direction === 'higher') {
    return [
      { max: t1, label: 'Ruim',  class: 'bad',   score: 25 },
      { max: t2, label: 'Fraco', class: 'weak',  score: 50 },
      { max: t3, label: 'Bom',   class: 'good',  score: 80 },
      { max: Infinity, label: 'Ótimo', class: 'great', score: 100 }
    ];
  }
  return [
    { max: t1, label: 'Ótimo', class: 'great', score: 100 },
    { max: t2, label: 'Bom',   class: 'good',  score: 80 },
    { max: t3, label: 'Fraco', class: 'weak',  score: 50 },
    { max: Infinity, label: 'Ruim', class: 'bad', score: 25 }
  ];
}

function defaultThresholds() {
  const t = {};
  Object.keys(BENCH_META).forEach(k => t[k] = BENCH_META[k].defaults.slice());
  return t;
}

let thresholds = defaultThresholds();
let BENCH = buildAllBench(thresholds);

function loadThresholds() {
  try {
    const saved = JSON.parse(localStorage.getItem(benchKey()));
    if (saved && typeof saved === 'object') {
      const out = defaultThresholds();
      Object.keys(BENCH_META).forEach(k => {
        if (Array.isArray(saved[k]) && saved[k].length === 3 && saved[k].every(n => typeof n === 'number' && isFinite(n))) {
          out[k] = saved[k];
        }
      });
      return out;
    }
  } catch {}
  return defaultThresholds();
}
function saveThresholds() { localStorage.setItem(benchKey(), JSON.stringify(thresholds)); }

// ===== Gestão de clientes =====
function loadClients() { try { return JSON.parse(localStorage.getItem(CLIENTS_KEY)) || []; } catch { return []; } }
function saveClients(list) { localStorage.setItem(CLIENTS_KEY, JSON.stringify(list)); }
function getActiveClientId() { return localStorage.getItem(ACTIVE_CLIENT_KEY); }
function setActiveClientId(id) { localStorage.setItem(ACTIVE_CLIENT_KEY, id); }

function initClients() {
  let clients = loadClients();
  const oldScenarios  = localStorage.getItem('ml_ads_scenarios_v1');
  const oldBenchmarks = localStorage.getItem('ml_ads_benchmarks_v1');

  if (clients.length === 0) {
    const id = genId();
    clients = [{ id, name: 'Minha Conta', createdAt: new Date().toISOString() }];
    saveClients(clients);
    setActiveClientId(id);
    if (oldScenarios)  { localStorage.setItem(`ml_ads_scenarios_${id}`, oldScenarios); localStorage.removeItem('ml_ads_scenarios_v1'); }
    if (oldBenchmarks) { localStorage.setItem(`ml_ads_benchmarks_${id}`, oldBenchmarks); localStorage.removeItem('ml_ads_benchmarks_v1'); }
  } else {
    const activeId = getActiveClientId();
    if (!activeId || !clients.find(c => c.id === activeId)) setActiveClientId(clients[0].id);
  }
}

function switchClient(id) {
  setActiveClientId(id);
  thresholds = loadThresholds();
  BENCH = buildAllBench(thresholds);
  renderClientBar();
  renderBenchEditor();
  render();
  renderSim();
  renderSaved();
  renderCompareSelector();
  renderCompareTable();
}

function addClient(name) {
  const clients = loadClients();
  const id = genId();
  clients.push({ id, name: name.trim(), createdAt: new Date().toISOString() });
  saveClients(clients);
  switchClient(id);
  renderClientModal();
}

function renameClient(id, name) {
  const clients = loadClients();
  const c = clients.find(x => x.id === id);
  if (c) { c.name = name.trim(); saveClients(clients); }
  renderClientBar();
  renderClientModal();
}

function deleteClient(id) {
  let clients = loadClients();
  if (clients.length <= 1) { toast('Não é possível excluir o único cliente'); return; }
  const name = clients.find(c => c.id === id)?.name;
  if (!confirm(`Excluir "${name}"? Todos os cenários e benchmarks serão perdidos.`)) return;
  clients = clients.filter(c => c.id !== id);
  saveClients(clients);
  localStorage.removeItem(`ml_ads_scenarios_${id}`);
  localStorage.removeItem(`ml_ads_benchmarks_${id}`);
  if (getActiveClientId() === id) switchClient(clients[0].id);
  else renderClientModal();
}

function renderClientBar() {
  const el = $('#clientBar');
  if (!el) return;
  const clients  = loadClients();
  const activeId = getActiveClientId();
  el.innerHTML = `
    <div class="client-bar-inner">
      <span class="client-bar-label">Cliente:</span>
      <div class="client-selector">
        <select id="clientSelect">
          ${clients.map(c => `<option value="${c.id}"${c.id === activeId ? ' selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <button class="btn ghost client-bar-btn" id="btnManageClients">⚙ Gerenciar</button>
      <button class="btn ghost client-bar-btn" id="btnNewClient">+ Novo Cliente</button>
    </div>
  `;
  $('#clientSelect').onchange = e => switchClient(e.target.value);
  $('#btnManageClients').onclick = () => { renderClientModal(); $('#clientModal').style.display = 'flex'; };
  $('#btnNewClient').onclick = () => {
    const name = prompt('Nome do novo cliente:');
    if (name && name.trim()) addClient(name.trim());
  };
}

function renderClientModal() {
  const clients  = loadClients();
  const activeId = getActiveClientId();
  const el = $('#clientList');
  if (!el) return;
  el.innerHTML = clients.map(c => `
    <div class="client-item${c.id === activeId ? ' active' : ''}">
      <span class="client-item-name">${c.name}</span>
      <div class="client-item-actions">
        ${c.id !== activeId
          ? `<button class="btn ghost client-sm-btn" data-act="switch" data-id="${c.id}">Selecionar</button>`
          : '<span class="client-active-badge">Ativo</span>'}
        <button class="btn ghost client-sm-btn" data-act="rename" data-id="${c.id}">Renomear</button>
        <button class="btn ghost client-sm-btn danger" data-act="delete" data-id="${c.id}">Excluir</button>
      </div>
    </div>
  `).join('');
  el.querySelectorAll('button').forEach(b => b.onclick = e => {
    const act = e.target.dataset.act;
    const id  = e.target.dataset.id;
    if (act === 'switch') { $('#clientModal').style.display = 'none'; switchClient(id); }
    if (act === 'rename') {
      const cur  = clients.find(c => c.id === id)?.name || '';
      const name = prompt('Novo nome:', cur);
      if (name && name.trim()) renameClient(id, name.trim());
    }
    if (act === 'delete') deleteClient(id);
  });
  $('#newClientName').value = '';
  $('#btnAddClient').onclick = () => {
    const name = $('#newClientName').value.trim();
    if (!name) return;
    addClient(name);
  };
  $('#btnClientModalClose').onclick = () => { $('#clientModal').style.display = 'none'; };
}

function buildAllBench(t) {
  const out = {};
  Object.keys(BENCH_META).forEach(k => {
    out[k] = buildBench(t[k], BENCH_META[k].direction);
  });
  return out;
}

function classify(type, v, margin) {
  if (v === null || v === undefined || isNaN(v)) return { label: '—', class: '', score: 0 };

  // ROAS e ACoS são relativos à margem
  if (type === 'roas') {
    const m = (margin || 0) / 100;
    if (m <= 0 || v <= 0) return { label: '—', class: '', score: 0 };
    const be = 1 / m;
    if (v < be)          return { label: 'Ruim',  class: 'bad',   score: 25 };
    if (v < be * 1.5)    return { label: 'Fraco', class: 'weak',  score: 50 };
    if (v < be * 2)      return { label: 'Bom',   class: 'good',  score: 80 };
    return                      { label: 'Ótimo', class: 'great', score: 100 };
  }
  if (type === 'acos') {
    const m = margin || 0;
    if (m <= 0 || v <= 0) return { label: '—', class: '', score: 0 };
    if (v > m)           return { label: 'Ruim',  class: 'bad',   score: 25 };
    if (v > m * 0.7)     return { label: 'Fraco', class: 'weak',  score: 50 };
    if (v > m * 0.4)     return { label: 'Bom',   class: 'good',  score: 80 };
    return                      { label: 'Ótimo', class: 'great', score: 100 };
  }
  // TACoS vs margem: quanto do faturamento total vai pra ads
  if (type === 'tacos') {
    const m = margin || 0;
    if (m <= 0 || v <= 0) return { label: '—', class: '', score: 0 };
    if (v > m)           return { label: 'Ruim',  class: 'bad',   score: 25 };
    if (v > m * 0.7)     return { label: 'Fraco', class: 'weak',  score: 50 };
    if (v > m * 0.4)     return { label: 'Bom',   class: 'good',  score: 80 };
    return                      { label: 'Ótimo', class: 'great', score: 100 };
  }
  // Margem operacional
  if (type === 'margemOp') {
    if (v <= 0)    return { label: 'Negativa', class: 'bad',   score: 25 };
    if (v < 5)     return { label: 'Fraca',    class: 'weak',  score: 50 };
    if (v < 15)    return { label: 'Boa',      class: 'good',  score: 80 };
    return               { label: 'Ótima',     class: 'great', score: 100 };
  }

  if (!BENCH[type]) return { label: '—', class: '', score: 0 };
  for (const b of BENCH[type]) {
    if (v < b.max) return b;
  }
  return BENCH[type][BENCH[type].length - 1];
}

// ===== Cálculo central =====
function compute(data) {
  const { margin, impressions, clicks, sales, revenue, totalRevenue, adSpend } = data;
  const m = (margin || 0) / 100;

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cvr = clicks > 0 ? (sales / clicks) * 100 : 0;
  const cpc = clicks > 0 ? adSpend / clicks : 0;
  const cpa = sales > 0 ? adSpend / sales : 0;
  const ticket = sales > 0 ? revenue / sales : 0;
  const roas = adSpend > 0 ? revenue / adSpend : 0;
  const acos = revenue > 0 ? (adSpend / revenue) * 100 : 0;
  const tacos = totalRevenue > 0 ? (adSpend / totalRevenue) * 100 : 0;
  const lucroBruto = revenue * m;
  const lucroLiquido = lucroBruto - adSpend;
  const margemOp = revenue > 0 ? (lucroLiquido / revenue) * 100 : 0;
  const breakEven = m > 0 ? 1 / m : 0;
  const cpm = impressions > 0 ? (adSpend / impressions) * 1000 : 0;
  const acosBE = (margin || 0);            // ACoS de equilíbrio = margem (%)
  const roasAlvo = breakEven > 0 ? breakEven * 1.2 : 0;   // folga de 20% sobre break-even
  const lucroPorClique = clicks > 0 ? lucroLiquido / clicks : 0;

  return {
    ctr, cvr, cpc, cpa, cpm, ticket, roas, acos, tacos,
    lucroBruto, lucroLiquido, margemOp, breakEven, acosBE, roasAlvo, lucroPorClique,
    ...data
  };
}

// ===== Coletar inputs =====
function gatherInputs() {
  return {
    margin: parseFloat($('#margin').value) || 0,
    impressions: parseFloat($('#impressions').value) || 0,
    clicks: parseFloat($('#clicks').value) || 0,
    sales: parseFloat($('#sales').value) || 0,
    revenue: parseFloat($('#revenue').value) || 0,
    totalRevenue: parseFloat($('#totalRevenue').value) || 0,
    adSpend: parseFloat($('#adSpend').value) || 0
  };
}

// ===== Atualizar KPIs =====
function updateKpi(id, value, badge) {
  const el = $(id);
  if (!el) return;
  const valEl = el.querySelector('.kpi-value');
  const previous = valEl.dataset.last || '';
  if (previous !== value) {
    valEl.classList.remove('flash');
    // force reflow para reiniciar animação
    void valEl.offsetWidth;
    valEl.classList.add('flash');
    valEl.dataset.last = value;
  }
  valEl.textContent = value;
  const b = el.querySelector('.kpi-badge');
  b.textContent = badge.label;
  b.className = 'kpi-badge ' + (badge.class || '');
  b.style.display = (!badge.label || badge.label === '—') ? 'none' : '';
}

function hasData(r) {
  return r.impressions > 0 || r.clicks > 0 || r.sales > 0 || r.revenue > 0 || r.adSpend > 0;
}

// ===== Render principal =====
let chartFin = null;
let chartRadar = null;
let chartCompareRadar = null;
let chartEvolTimeline = null;

function render() {
  const input = gatherInputs();
  const r = compute(input);
  const ok = hasData(r);

  const bCtr  = classify('ctr',      r.ctr);
  const bCvr  = classify('cvr',      r.cvr);
  const bRoas = classify('roas',     r.roas,     r.margin);
  const bAcos = classify('acos',     r.acos,     r.margin);
  const bTacos = classify('tacos',   r.tacos,    r.margin);
  const bMargemOp = classify('margemOp', r.margemOp);

  // CPA vs CPA de equilíbrio (ticket × margem)
  const bCpa = (() => {
    const beCpa = r.ticket * (r.margin / 100);
    if (!ok || beCpa <= 0 || r.cpa <= 0) return { label: '—', class: '' };
    if (r.cpa > beCpa)         return { label: 'Ruim',  class: 'bad'   };
    if (r.cpa > beCpa * 0.8)   return { label: 'Fraco', class: 'weak'  };
    if (r.cpa > beCpa * 0.5)   return { label: 'Bom',   class: 'good'  };
    return                            { label: 'Ótimo', class: 'great' };
  })();

  // Lucro líquido
  const bLucro = !ok ? { label: '—', class: '' }
    : r.lucroLiquido > 0 ? { label: 'Lucro',    class: 'great' }
    :                       { label: 'Prejuízo', class: 'bad'   };

  // Lucro por clique
  const bLucroCli = (!ok || r.clicks <= 0) ? { label: '—', class: '' }
    : r.lucroPorClique > 0 ? { label: 'Positivo', class: 'great' }
    :                         { label: 'Negativo', class: 'bad'   };

  // ROAS vs break-even
  const bBreakEven = (!ok || r.roas <= 0) ? { label: '—', class: '' }
    : r.roas >= r.breakEven ? { label: 'Acima',  class: 'great' }
    :                          { label: 'Abaixo', class: 'bad'   };

  const none = { label: '—', class: '' };

  updateKpi('#kpi-ctr',         ok ? fmtPct(r.ctr)              : '—', ok ? bCtr       : none);
  updateKpi('#kpi-cvr',         ok ? fmtPct(r.cvr)              : '—', ok ? bCvr       : none);
  updateKpi('#kpi-roas',        ok ? fmtNum(r.roas, 2) + 'x'    : '—', ok ? bRoas      : none);
  updateKpi('#kpi-acos',        ok ? fmtPct(r.acos)             : '—', ok ? bAcos      : none);
  updateKpi('#kpi-tacos',       ok ? fmtPct(r.tacos)            : '—', ok ? bTacos     : none);
  updateKpi('#kpi-cpa',         ok ? fmtBRL(r.cpa)              : '—', bCpa);
  updateKpi('#kpi-lucroLiquido',ok ? fmtBRL(r.lucroLiquido)     : '—', bLucro);
  updateKpi('#kpi-margemOp',    ok ? fmtPct(r.margemOp)         : '—', ok ? bMargemOp  : none);
  updateKpi('#kpi-lucroCli',    ok && r.clicks > 0 ? fmtBRL(r.lucroPorClique) : '—', bLucroCli);
  updateKpi('#kpi-breakEven',   r.breakEven > 0 ? fmtNum(r.breakEven, 2) + 'x' : '—', bBreakEven);

  // Métricas referenciais — sem badge classificatório
  updateKpi('#kpi-cpc',       ok ? fmtBRL(r.cpc)              : '—', none);
  updateKpi('#kpi-ticket',    ok ? fmtBRL(r.ticket)           : '—', none);
  updateKpi('#kpi-lucroBruto',ok ? fmtBRL(r.lucroBruto)       : '—', none);
  updateKpi('#kpi-cpm',       ok && r.cpm > 0 ? fmtBRL(r.cpm) : '—', none);
  updateKpi('#kpi-acosBE',    r.acosBE > 0 ? fmtPct(r.acosBE)           : '—', none);
  updateKpi('#kpi-roasAlvo',  r.roasAlvo > 0 ? fmtNum(r.roasAlvo, 2) + 'x' : '—', none);

  renderDelta(r);
  renderFinanceChart(r);
  renderFunnel(r);
  renderDiagnostics(r);
  renderActionPlan(r);
  renderHealth(r, bCtr, bCvr, bRoas);
  renderRadar(bCtr, bCvr, bRoas, bAcos);
  renderBenchDerived();
}

function renderDelta(r) {
  const emptyEl = $('#chartDeltaEmpty');
  
  if (chartEvolTimeline) { chartEvolTimeline.destroy(); chartEvolTimeline = null; }

  const list = loadScenarios();
  const history = [...list];
  if (hasData(r)) history.push({ name: 'Atual', r });

  if (history.length < 2) {
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }
  
  if (emptyEl) emptyEl.style.display = 'none';

  const ctx = $('#chartEvolTimeline').getContext('2d');
  const labels = history.map(c => c.name || 'Salvo');
  const dataRoas = history.map(c => c.r.roas || 0);
  const dataLucro = history.map(c => c.r.lucroLiquido || 0);
  const dataMargem = history.map(c => c.r.margemOp || 0);
  const dataTacos = history.map(c => c.r.tacos || 0);

  chartEvolTimeline = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Lucro Líquido (R$)',
          data: dataLucro,
          borderColor: '#27c47a',
          backgroundColor: 'rgba(39,196,122,0.1)',
          fill: true,
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          label: 'ROAS',
          data: dataRoas,
          borderColor: '#ff9f43',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.3,
          yAxisID: 'y1'
        },
        {
          label: 'Margem Op. (%)',
          data: dataMargem,
          borderColor: '#3483fa',
          backgroundColor: 'transparent',
          borderDash: [3, 3],
          tension: 0.3,
          yAxisID: 'y2'
        },
        {
          label: 'TACoS (%)',
          data: dataTacos,
          borderColor: '#ff5e5e',
          backgroundColor: 'transparent',
          tension: 0.3,
          yAxisID: 'y2',
          hidden: true // hidden by default to not clutter
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { 
        legend: { labels: { color: getCssVar('--text'), usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                if (label.includes('(R$)')) {
                  label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                } else if (label.includes('ROAS')) {
                  label += context.parsed.y.toFixed(2) + 'x';
                } else if (label.includes('(%)')) {
                  label += context.parsed.y.toFixed(2) + '%';
                } else {
                  label += context.parsed.y;
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: getCssVar('--muted') }, grid: { display: false } },
        y: { 
          type: 'linear', display: true, position: 'left',
          ticks: { color: getCssVar('--muted') }, grid: { color: getCssVar('--border') }
        },
        y1: {
          type: 'linear', display: false, position: 'right',
          grid: { drawOnChartArea: false }
        },
        y2: {
          type: 'linear', display: false, position: 'right',
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

function renderFinanceChart(r) {
  const ctx = $('#chartFinance').getContext('2d');
  if (chartFin) chartFin.destroy();
  if (!r.revenue || r.revenue <= 0) return;

  const ad = r.adSpend || 0;
  const lucroLiquido = r.lucroLiquido || 0;
  const lucroBruto = r.lucroBruto || 0;
  const custoProduto = Math.max(0, r.revenue - lucroBruto);
  const isLoss = lucroLiquido < 0;

  // Se há prejuízo, o lucro negativo "cobre" parte dos custos — mostramos só o positivo
  const lucroSlice = Math.max(0, lucroLiquido);
  const prejSlice  = Math.max(0, -lucroLiquido);

  const labels = ['Custos / Taxas', 'Investimento Ads'];
  const data   = [custoProduto, ad];
  const colors = ['#ff9f43', '#3483fa'];

  if (isLoss) {
    labels.push('Prejuízo Líquido');
    data.push(prejSlice);
    colors.push('#ff5e5e');
  } else {
    labels.push('Lucro Líquido');
    data.push(lucroSlice);
    colors.push('#27c47a');
  }

  chartFin = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: getCssVar('--card'),
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: getCssVar('--text'),
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 14,
            font: { family: 'Satoshi, Inter, sans-serif', size: 12, weight: '600' }
          }
        },
        tooltip: {
          callbacks: {
            label: (c) => {
              const pct = r.revenue > 0 ? ((c.raw / r.revenue) * 100).toFixed(1) : 0;
              return ` ${fmtBRL(c.raw)}  (${pct}% da receita)`;
            }
          }
        }
      }
    },
    plugins: [{
      id: 'centerLabel',
      afterDraw(chart) {
        const { ctx: c, chartArea: { left, right, top, bottom } } = chart;
        const cx = (left + right) / 2;
        const cy = (top + bottom) / 2;
        c.save();
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `700 11px Satoshi, Inter, sans-serif`;
        c.fillStyle = getCssVar('--muted');
        c.fillText('Receita total', cx, cy - 14);
        c.font = `700 18px Satoshi, Inter, sans-serif`;
        c.fillStyle = getCssVar('--text');
        c.fillText(fmtBRL(r.revenue), cx, cy + 8);
        c.restore();
      }
    }]
  });
}

// ===== Funil de Conversão =====
function renderFunnel(r) {
  const el = $('#funnelChart');
  if (!el) return;

  if (!hasData(r)) {
    el.innerHTML = '<div class="empty">Preencha os dados na Calculadora para visualizar o funil.</div>';
    return;
  }

  const isProfit = r.lucroLiquido >= 0;

  // Calculate dynamic widths representing the funnel drop gracefully
  // Since real CVR can be tiny (1%), a linear scale makes bars too small.
  // We use a smoothed/clamped scale to show the drop but remain readable.
  
  const wImpressions = 100;
  
  // Decrease width somewhat proportionally but bounded
  const ratioClicks = Math.max(0.01, r.clicks / (r.impressions || 1));
  const wClicks = Math.max(65, wImpressions - (1 - Math.pow(ratioClicks, 0.4)) * 35);
  
  const ratioSales = Math.max(0.01, r.sales / (r.clicks || 1));
  const wSales = Math.max(40, wClicks - (1 - Math.pow(ratioSales, 0.4)) * 25);
  
  // Profit isn't a count, so we scale it based on ROAS / Target ROAS
  const beRoas = r.margin > 0 ? 1 / (r.margin / 100) : 1;
  const ratioProfit = Math.min(1.5, Math.max(0.2, r.roas / beRoas));
  const wProfit = isProfit ? Math.max(25, Math.min(wSales, 20 + 20 * ratioProfit)) : 25;

  const stages = [
    { label: 'Impressões', value: fmtNum(r.impressions), icon: '👁️', color: '#3483fa', width: wImpressions },
    { label: 'Cliques',    value: fmtNum(r.clicks),      icon: '🖱️', color: '#8b5cf6', width: wClicks },
    { label: 'Vendas',     value: fmtNum(r.sales),        icon: '🛒', color: '#ff9f43', width: wSales },
    {
      label: isProfit ? 'Lucro Líquido' : 'Prejuízo',
      value: fmtBRL(r.lucroLiquido),
      icon: isProfit ? '💰' : '📉',
      color: isProfit ? '#27c47a' : '#ff5e5e',
      width: wProfit
    }
  ];

  const connectors = [
    { label: 'CTR', value: fmtPct(r.ctr), cls: classify('ctr', r.ctr).class },
    { label: 'CVR', value: fmtPct(r.cvr), cls: classify('cvr', r.cvr).class },
    {
      label: 'Lucro / Venda',
      value: r.sales > 0 ? fmtBRL(r.lucroLiquido / r.sales) : '—',
      cls: r.lucroLiquido >= 0 ? 'great' : 'bad'
    }
  ];

  let html = '';
  stages.forEach((stage, i) => {
    html += `
      <div class="funnel-stage" style="--delay: ${i * 0.12}s">
        <div class="funnel-bar" style="width: ${stage.width}%; --bar-color: ${stage.color}">
          <div class="funnel-bar-glow"></div>
          <div class="funnel-bar-content">
            <div class="funnel-label">
              <span class="funnel-icon">${stage.icon}</span>
              <span>${stage.label}</span>
            </div>
            <div class="funnel-value">${stage.value}</div>
          </div>
        </div>
      </div>`;

    if (i < connectors.length) {
      const c = connectors[i];
      html += `
        <div class="funnel-connector" style="--delay: ${i * 0.12 + 0.06}s">
          <div class="funnel-flow">
            <span class="funnel-flow-dot"></span>
          </div>
          <div class="funnel-rate">
            <span class="funnel-rate-label">${c.label}</span>
            <span class="funnel-rate-value ${c.cls || ''}">${c.value}</span>
          </div>
        </div>`;
    }
  });

  el.innerHTML = html;
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ===== Diagnóstico inteligente =====
function renderDiagnostics(r) {
  const el = $('#diagnostics');
  if (!hasData(r)) {
    el.innerHTML = '<div class="empty">Preencha os dados na Calculadora para obter o diagnóstico.</div>';
    return;
  }
  const items = [];
  const bCtr = classify('ctr', r.ctr);
  const bCvr = classify('cvr', r.cvr);
  const bRoas = classify('roas', r.roas, r.margin);

  if (r.ctr > 1.5 && r.cvr < 3) {
    items.push({
      level: 'critical',
      icon: '🚨',
      title: 'CTR alto + CVR baixo — Problema na página do produto',
      text: 'Seu anúncio atrai cliques, mas a página de vendas não converte. Revise: preço vs. concorrência, fotos, título, descrição, reputação/avaliações, frete, estoque.'
    });
  }
  if (r.ctr < 0.5 && r.cvr > 4) {
    items.push({
      level: 'warning',
      icon: '🎯',
      title: 'CTR baixo — Anúncio pouco atrativo',
      text: 'Sua página converte bem, mas o anúncio não chama atenção. Teste títulos mais ricos em palavras-chave, novas imagens e destaque diferenciais.'
    });
  }
  if (r.roas > 0 && r.roas < r.breakEven) {
    items.push({
      level: 'critical',
      icon: '💸',
      title: 'ROAS abaixo do equilíbrio — Prejuízo',
      text: `Seu ROAS é ${fmtNum(r.roas,2)}x, mas precisaria ser ao menos ${fmtNum(r.breakEven,2)}x para cobrir custos. Pause campanhas ruins, melhore segmentação ou aumente margem.`
    });
  }
  if (r.roas >= r.breakEven && r.roas < r.breakEven * 1.5) {
    items.push({
      level: 'warning',
      icon: '⚠️',
      title: 'Rentabilidade marginal',
      text: 'Você está lucrando pouco acima do ponto de equilíbrio. Pequenas variações de CPC ou CVR podem te tirar do lucro.'
    });
  }
  if (r.roas >= r.breakEven * 2) {
    items.push({
      level: 'ok',
      icon: '✅',
      title: 'Campanha muito rentável',
      text: 'Seu ROAS está bem acima do equilíbrio. Considere aumentar o investimento para escalar as vendas.'
    });
  }
  if (r.tacos > 0 && r.tacos > 20) {
    items.push({
      level: 'warning',
      icon: '📊',
      title: 'TACoS elevado',
      text: `Você depende demais de ads (${fmtPct(r.tacos)} da receita total). Invista em SEO e marca para reduzir dependência.`
    });
  }
  if (r.tacos > 0 && r.tacos < 10 && r.totalRevenue > 0) {
    items.push({
      level: 'info',
      icon: '🌱',
      title: 'Ads com baixo peso na receita total',
      text: 'Seu TACoS é baixo — seus ads geram vendas incrementais sem canibalizar o orgânico. Excelente sinal.'
    });
  }
  if (r.cpa > 0 && r.cpa > r.ticket * (r.margin / 100)) {
    items.push({
      level: 'critical',
      icon: '🔥',
      title: 'CPA maior que lucro unitário',
      text: `Você gasta ${fmtBRL(r.cpa)} para adquirir um cliente, mas cada venda só rende ${fmtBRL(r.ticket * (r.margin / 100))} de lucro bruto.`
    });
  }
  if (r.acos > 0 && r.margin > 0 && r.acos > r.margin) {
    items.push({
      level: 'critical',
      icon: '🧨',
      title: 'ACoS acima da margem — Ads drenam o lucro',
      text: `Seu ACoS (${fmtPct(r.acos)}) supera a margem do produto (${fmtPct(r.margin)}). Cada venda via Ads sai no prejuízo. Reveja lances, palavras-chave negativas e segmentação.`
    });
  }
  if (r.cpm > 0 && r.cpm > 60) {
    items.push({
      level: 'warning',
      icon: '📡',
      title: 'CPM alto',
      text: `Custo por mil impressões de ${fmtBRL(r.cpm)} está acima do usual para ML (R$ 10–50). Pode indicar categoria muito competitiva ou segmentação ruim.`
    });
  }
  if (r.ctr > 2 && r.cvr >= 1.5) {
    items.push({
      level: 'ok',
      icon: '🚀',
      title: 'Oportunidade de escala',
      text: `CTR ${fmtPct(r.ctr)} e CVR ${fmtPct(r.cvr)} estão ótimos. Aumente o orçamento 20–30% por semana monitorando ROAS.`
    });
  }
  if (r.impressions > 0 && r.impressions < 1000) {
    items.push({
      level: 'info',
      icon: '📉',
      title: 'Volume de impressões baixo',
      text: 'Menos de 1.000 impressões limita a capacidade estatística. Considere ampliar palavras-chave, orçamento ou categorias.'
    });
  }
  if (bCtr.class === 'great' && bCvr.class === 'great' && bRoas.class === 'great') {
    items.push({
      level: 'ok',
      icon: '🏆',
      title: 'Campanha campeã',
      text: 'Todos os indicadores no nível ótimo. Replique essa receita para outros produtos e escale o orçamento gradualmente.'
    });
  }
  if (items.length === 0) {
    items.push({ level: 'info', icon: 'ℹ️', title: 'Indicadores equilibrados', text: 'Nada crítico detectado. Continue monitorando e testando variações.' });
  }

  el.innerHTML = items.map(it => `
    <div class="diag-item ${it.level}">
      <div class="diag-icon">${it.icon}</div>
      <div class="diag-body">
        <h4>${it.title}</h4>
        <p>${it.text}</p>
      </div>
    </div>
  `).join('');
}

// ===== Plano de ação =====
function renderActionPlan(r) {
  const el = $('#actionPlan');
  if (!hasData(r)) {
    el.innerHTML = '<li class="empty-li">As recomendações aparecem aqui após o cálculo.</li>';
    return;
  }
  const plan = [];
  const bCtr = classify('ctr', r.ctr);
  const bCvr = classify('cvr', r.cvr);
  const bRoas = classify('roas', r.roas, r.margin);

  if (bRoas.class === 'bad' || r.roas < r.breakEven) {
    plan.push({ p: 'high', t: 'Pausar palavras-chave / produtos com ACoS acima do break-even.' });
  }
  if (bCvr.class === 'bad' || bCvr.class === 'weak') {
    plan.push({ p: 'high', t: 'Otimizar página do produto: melhor preço, fotos profissionais, títulos com palavras-chave, descrições ricas, respostas rápidas.' });
  }
  if (bCtr.class === 'bad' || bCtr.class === 'weak') {
    plan.push({ p: 'med', t: 'Testar novas imagens principais e títulos com gatilhos (ex: "Frete grátis", "Promoção", "Lançamento").' });
  }
  if (r.impressions > 0 && r.impressions < 5000) {
    plan.push({ p: 'med', t: 'Aumentar alcance: ampliar palavras-chave, ativar campanhas automáticas, revisar lances.' });
  }
  if (r.cpc > r.ticket * 0.1) {
    plan.push({ p: 'med', t: 'CPC alto frente ao ticket. Revisar lances máximos e focar em termos long-tail.' });
  }
  if (bRoas.class === 'great' && bCvr.class !== 'bad') {
    plan.push({ p: 'low', t: 'Escalar o investimento gradualmente (10-20% por semana) mantendo eficiência.' });
  }
  if (r.roasAlvo > 0) {
    plan.push({ p: 'med', t: `Configurar ROAS Alvo da campanha em <b>${fmtNum(r.roasAlvo, 2)}x</b> (20% acima do break-even de ${fmtNum(r.breakEven, 2)}x).` });
  }
  if (r.totalRevenue > 0 && r.tacos < 10) {
    plan.push({ p: 'low', t: 'Replicar a estratégia vencedora para outros produtos da loja.' });
  }
  plan.push({ p: 'low', t: 'Monitorar semanalmente: CTR, CVR, ROAS e ajustar lances com base em dados.' });

  const labels = { high: 'Alta prioridade', med: 'Média prioridade', low: 'Baixa prioridade' };
  const order = { high: 0, med: 1, low: 2 };
  plan.sort((a, b) => order[a.p] - order[b.p]);
  el.innerHTML = plan.map(i => `<li class="${i.p}"><b>[${labels[i.p]}]</b> ${i.t}</li>`).join('');
}

// ===== Saúde geral (score 0-100) =====
function renderHealth(r, bCtr, bCvr, bRoas) {
  if (!hasData(r)) {
    $('#healthBar').style.width = '0%';
    $('#healthScore').textContent = '—';
    $('#healthLabel').textContent = 'Aguardando dados';
    return;
  }
  const score = Math.round(((bCtr.score || 0) + (bCvr.score || 0) + (bRoas.score || 0)) / 3);
  $('#healthBar').style.width = score + '%';
  $('#healthScore').textContent = score;
  let label = 'Crítico';
  if (score >= 80) label = 'Excelente';
  else if (score >= 60) label = 'Bom';
  else if (score >= 40) label = 'Regular';
  else if (score >= 25) label = 'Fraco';
  $('#healthLabel').textContent = label;
}

function renderRadar(bCtr, bCvr, bRoas, bAcos) {
  const ctx = $('#chartRadar').getContext('2d');
  if (chartRadar) chartRadar.destroy();
  chartRadar = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['CTR', 'CVR', 'ROAS', 'ACoS (invertido)'],
      datasets: [{
        label: 'Score',
        data: [bCtr.score || 0, bCvr.score || 0, bRoas.score || 0, bAcos.score || 0],
        backgroundColor: 'rgba(52,131,250,.25)',
        borderColor: '#3483fa',
        borderWidth: 2,
        pointBackgroundColor: '#3483fa'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { color: getCssVar('--muted'), backdropColor: 'transparent' },
          grid: { color: getCssVar('--border') },
          angleLines: { color: getCssVar('--border') },
          pointLabels: { color: getCssVar('--text'), font: { family: 'Inter', weight: '600' } }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

// ===== Cenários salvos =====
function loadScenarios() { try { return JSON.parse(localStorage.getItem(scenariosKey())) || []; } catch { return []; } }
function saveScenarios(list) { localStorage.setItem(scenariosKey(), JSON.stringify(list)); }

function renderSaved() {
  const list = loadScenarios();
  const el = $('#savedList');
  if (list.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = list.map((s, i) => `
    <div class="saved-item" id="saved-item-${i}">
      <div class="saved-info">
        <b>${s.name}</b>
        <span class="saved-meta">ROAS ${fmtNum(s.r.roas, 2)}x • Lucro ${fmtBRL(s.r.lucroLiquido)}</span>
      </div>
      <div class="actions">
        <button data-act="load" data-i="${i}">Carregar</button>
        <button data-act="edit" data-i="${i}">Editar</button>
        <button data-act="del"  data-i="${i}">Excluir</button>
      </div>
    </div>
  `).join('');
  el.querySelectorAll('button').forEach(b => b.onclick = onSavedAction);
  renderCompareSelector();
}

let _editingIndex = -1;

function openEditModal(i) {
  const list = loadScenarios();
  const s = list[i];
  _editingIndex = i;

  $('#editModalName').value         = s.name;
  $('#editModalMargin').value       = s.input.margin       || '';
  $('#editModalImpressions').value  = s.input.impressions  || '';
  $('#editModalClicks').value       = s.input.clicks       || '';
  $('#editModalSales').value        = s.input.sales        || '';
  $('#editModalRevenue').value      = s.input.revenue      || '';
  $('#editModalTotalRevenue').value = s.input.totalRevenue || '';
  $('#editModalAdSpend').value      = s.input.adSpend      || '';

  updateModalPreview();
  $('#editModal').style.display = 'flex';
  $('#editModalName').focus();
  $('#editModalName').select();
}

function gatherModalInputs() {
  return {
    margin:       parseFloat($('#editModalMargin').value)       || 0,
    impressions:  parseFloat($('#editModalImpressions').value)  || 0,
    clicks:       parseFloat($('#editModalClicks').value)       || 0,
    sales:        parseFloat($('#editModalSales').value)        || 0,
    revenue:      parseFloat($('#editModalRevenue').value)      || 0,
    totalRevenue: parseFloat($('#editModalTotalRevenue').value) || 0,
    adSpend:      parseFloat($('#editModalAdSpend').value)      || 0,
  };
}

function updateModalPreview() {
  const input = gatherModalInputs();
  const r = compute(input);
  const ok = hasData(input);

  const set = (id, val, cls) => {
    const el = $(id);
    if (!el) return;
    el.textContent = val;
    el.className = 'modal-kpi-val' + (cls ? ' ' + cls : '');
  };

  set('#mpRoas',       ok ? fmtNum(r.roas, 2) + 'x' : '—');
  set('#mpAcos',       ok ? fmtPct(r.acos)    : '—');
  set('#mpCtr',        ok ? fmtPct(r.ctr)     : '—');
  set('#mpCvr',        ok ? fmtPct(r.cvr)     : '—');
  set('#mpLucroBruto', ok ? fmtBRL(r.lucroBruto) : '—');
  set('#mpBreakEven',  r.breakEven > 0 ? fmtNum(r.breakEven, 2) + 'x' : '—');

  const lucroClass = ok ? (r.lucroLiquido >= 0 ? 'positive' : 'negative') : '';
  set('#mpLucroLiquido', ok ? fmtBRL(r.lucroLiquido) : '—', lucroClass);

  const margemClass = ok ? (r.margemOp >= 0 ? 'positive' : 'negative') : '';
  set('#mpMargemOp', ok ? fmtPct(r.margemOp) : '—', margemClass);
}

function closeEditModal() {
  $('#editModal').style.display = 'none';
  _editingIndex = -1;
}

// Listeners do modal
['#editModalMargin','#editModalImpressions','#editModalClicks',
 '#editModalSales','#editModalRevenue','#editModalTotalRevenue','#editModalAdSpend']
  .forEach(s => $(s).addEventListener('input', updateModalPreview));

$('#btnModalClose').onclick  = closeEditModal;
$('#btnModalCancel').onclick = closeEditModal;

// Fechar ao clicar fora do box
$('#editModal').addEventListener('click', (e) => {
  if (e.target === $('#editModal')) closeEditModal();
});

// Fechar com Esc
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#editModal').style.display !== 'none') closeEditModal();
});

$('#btnModalSave').onclick = () => {
  if (_editingIndex < 0) return;
  const name = $('#editModalName').value.trim();
  if (!name) { toast('Dê um nome ao cenário'); return; }
  const input = gatherModalInputs();
  if (!hasData(input)) { toast('Preencha ao menos um campo de dados'); return; }
  const r = compute(input);
  const list = loadScenarios();
  list[_editingIndex] = { name, input, r, date: new Date().toISOString() };
  saveScenarios(list);
  renderSaved();
  render();
  closeEditModal();
  toast('Cenário atualizado');
};

function onSavedAction(e) {
  const i = parseInt(e.target.dataset.i);
  const act = e.target.dataset.act;
  const list = loadScenarios();

  if (act === 'del') {
    list.splice(i, 1);
    saveScenarios(list);
    renderSaved();
    renderCompareTable();
    toast('Cenário excluído');

  } else if (act === 'load') {
    const s = list[i];
    $('#margin').value       = s.input.margin       || '';
    $('#impressions').value  = s.input.impressions  || '';
    $('#clicks').value       = s.input.clicks       || '';
    $('#sales').value        = s.input.sales        || '';
    $('#revenue').value      = s.input.revenue      || '';
    $('#totalRevenue').value = s.input.totalRevenue || '';
    $('#adSpend').value      = s.input.adSpend      || '';
    $('#scenarioName').value = s.name;
    render();
    toast('Cenário carregado');

  } else if (act === 'edit') {
    openEditModal(i);
  }
}

$('#btnSave').onclick = () => {
  const name = $('#scenarioName').value.trim();
  if (!name) { toast('Dê um nome ao cenário'); return; }
  const input = gatherInputs();
  if (!hasData(input)) { toast('Preencha os dados primeiro'); return; }
  const r = compute(input);
  const list = loadScenarios();
  list.push({ name, input, r, date: new Date().toISOString() });
  saveScenarios(list);
  renderSaved();
  render();
  toast('Cenário salvo');
};

// ===== Tabs =====
$$('.tab').forEach(t => t.onclick = () => {
  $$('.tab').forEach(x => x.classList.remove('active'));
  $$('.view').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  $('#view-' + t.dataset.tab).classList.add('active');
  if (t.dataset.tab === 'compare') renderCompareTable();
});

// ===== Tema =====
$('#btnTheme').onclick = () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ml_ads_theme', next);
  render();
  renderCompareTable();
};
(function restoreTheme() {
  const t = localStorage.getItem('ml_ads_theme');
  if (t) document.documentElement.setAttribute('data-theme', t);
})();

// ===== Exemplo / reset =====
$('#btnExample').onclick = () => {
  $('#margin').value = 25;
  $('#impressions').value = 50000;
  $('#clicks').value = 750;
  $('#sales').value = 45;
  $('#revenue').value = 4500;
  $('#totalRevenue').value = 18000;
  $('#adSpend').value = 900;
  render();
  toast('Exemplo carregado');
};

$('#btnReset').onclick = () => {
  ['#margin', '#impressions', '#clicks', '#sales', '#revenue', '#totalRevenue', '#adSpend', '#scenarioName']
    .forEach(s => $(s).value = '');
  render();
  toast('Campos limpos');
};

// ===== Simulador =====
function syncSimFromInputs() {
  const r = compute(gatherInputs());
  if (hasData(r)) {
    $('#simCtr').value = Math.min(10, r.ctr || 1.5);
    $('#simCvr').value = Math.min(30, r.cvr || 6);
    $('#simCpc').value = Math.min(10, r.cpc || 1.2);
    $('#simTicket').value = Math.min(2000, r.ticket || 100);
    $('#simMargin').value = Math.min(80, r.margin || 25);
    $('#simImp').value = Math.min(500000, r.impressions || 50000);
  }
  renderSim();
}
$('#btnSyncSim').onclick = syncSimFromInputs;

function renderSim() {
  const ctr = parseFloat($('#simCtr').value) || 0;
  const cvr = parseFloat($('#simCvr').value) || 0;
  const cpc = parseFloat($('#simCpc').value) || 0;
  const ticket = parseFloat($('#simTicket').value) || 0;
  const margin = parseFloat($('#simMargin').value) || 0;
  const imp = parseFloat($('#simImp').value) || 0;

  if (document.activeElement !== $('#simCtrVal')) $('#simCtrVal').value = Number(ctr).toFixed(2);
  if (document.activeElement !== $('#simCvrVal')) $('#simCvrVal').value = Number(cvr).toFixed(2);
  if (document.activeElement !== $('#simCpcVal')) $('#simCpcVal').value = Number(cpc).toFixed(2);
  if (document.activeElement !== $('#simTicketVal')) $('#simTicketVal').value = Number(ticket).toFixed(0);
  if (document.activeElement !== $('#simMarginVal')) $('#simMarginVal').value = Number(margin).toFixed(1);
  if (document.activeElement !== $('#simImpVal')) $('#simImpVal').value = Number(imp).toFixed(0);

  const clicks = imp * (ctr / 100);
  const sales = clicks * (cvr / 100);
  const spend = clicks * cpc;
  const rev = sales * ticket;
  const roas = spend > 0 ? rev / spend : 0;
  const acos = rev > 0 ? (spend / rev) * 100 : 0;
  const profit = rev * (margin / 100) - spend;
  const marOp = rev > 0 ? (profit / rev) * 100 : 0;

  $('#simClicks').textContent = fmtNum(clicks, 0);
  $('#simSales').textContent = fmtNum(sales, 0);
  $('#simSpend').textContent = fmtBRL(spend);
  $('#simRev').textContent = fmtBRL(rev);
  $('#simRoas').textContent = fmtNum(roas, 2) + 'x';
  $('#simAcos').textContent = fmtPct(acos);
  $('#simProfit').textContent = fmtBRL(profit);
  $('#simMarOp').textContent = fmtPct(marOp);

  // Deltas against base scenario
  const base = compute(gatherInputs());
  if (hasData(base)) {
    const doD = (id, cur, orig, type, revGood = false) => {
      const el = $('#' + id);
      if (!el) return;
      const diff = cur - orig;
      if (Math.abs(diff) < 0.005) { el.innerHTML = ''; return; }
      
      let isGood = diff > 0;
      if (revGood) isGood = diff < 0;
      
      const sign = diff > 0 ? '+' : '';
      const cl = isGood ? 'sim-delta pos' : 'sim-delta neg';
      
      let txt = '';
      if (type === 'pct') txt = sign + fmtNum(diff, 2) + '%';
      else if (type === 'brl') txt = diff > 0 ? '+' + fmtBRL(diff).trim() : fmtBRL(diff).trim();
      else if (type === 'roas') txt = sign + fmtNum(diff, 2) + 'x';
      else txt = sign + fmtNum(diff, 0);
      
      el.innerHTML = `<span class="${cl}">${txt}</span>`;
    };

    doD('simDeltaClicks', clicks, base.clicks, 'num');
    doD('simDeltaSales', sales, base.sales, 'num');
    doD('simDeltaSpend', spend, base.adSpend, 'brl', true); // less spend is good
    doD('simDeltaRev', rev, base.revenue, 'brl');
    doD('simDeltaRoas', roas, base.roas, 'roas');
    doD('simDeltaAcos', acos, base.acos, 'pct', true);      // less ACoS is good
    doD('simDeltaProfit', profit, base.lucroLiquido, 'brl');
    doD('simDeltaMarOp', marOp, base.margemOp, 'pct');
  } else {
    ['simDeltaClicks','simDeltaSales','simDeltaSpend','simDeltaRev','simDeltaRoas','simDeltaAcos','simDeltaProfit','simDeltaMarOp'].forEach(id => {
      if($('#'+id)) $('#'+id).innerHTML = '';
    });
  }
}
['#simCtr', '#simCvr', '#simCpc', '#simTicket', '#simMargin', '#simImp'].forEach(s => {
  $(s).addEventListener('input', () => { renderSim(); renderRoasTarget(); });
  $(s + 'Val').addEventListener('input', (e) => {
    $(s).value = e.target.value;
    renderSim();
    renderRoasTarget();
  });
});

// ===== ROAS Objetivo =====
let _roasDriving = false;
let _baseImpressions = 50000; // baseline impressions before ROAS adjustment

// Save baseline when syncing from calculator
const _origSyncSim = syncSimFromInputs;
syncSimFromInputs = function() {
  _origSyncSim();
  _baseImpressions = parseFloat($('#simImp').value) || 50000;
  // Also set ROAS slider to current computed ROAS
  const r = compute(gatherInputs());
  if (hasData(r) && r.roas > 0) {
    const clampedRoas = Math.max(0.5, Math.min(30, r.roas));
    $('#roasTarget').value = clampedRoas;
    $('#roasTargetVal').value = clampedRoas.toFixed(1);
  }
  renderRoasTarget();
};
$('#btnSyncSim').onclick = syncSimFromInputs;

// Update baseline when user manually changes impressions
$('#simImp').addEventListener('change', () => {
  if (!_roasDriving) _baseImpressions = parseFloat($('#simImp').value) || 50000;
});
$('#simImpVal').addEventListener('change', () => {
  if (!_roasDriving) _baseImpressions = parseFloat($('#simImp').value) || 50000;
});

/**
 * ML Ads impression multiplier curve.
 * ratio = roasTarget / breakeven
 * - ratio < 1 (aggressive): impressions increase up to 2x
 * - ratio = 1 (neutral): no change
 * - ratio > 1 (conservative): impressions decrease exponentially
 * - ratio > 5 (extreme): campaign nearly dies (1-5% impressions)
 */
function mlImpMultiplier(ratio) {
  if (ratio <= 0) return 1;
  if (ratio <= 1) {
    // Aggressive zone: boost impressions, soft curve, cap at 2x
    return Math.min(2, 1 / Math.pow(ratio, 0.7));
  } else {
    // Conservative zone: exponential falloff
    return Math.max(0.01, 1 / Math.pow(ratio, 1.3));
  }
}

function renderRoasTarget(fromRoasSlider = false) {
  const roasTarget = parseFloat($('#roasTarget').value) || 0;
  const margin = parseFloat($('#simMargin').value) || 0;
  const ticket = parseFloat($('#simTicket').value) || 0;
  const cvr = parseFloat($('#simCvr').value) || 0;
  const ctr = parseFloat($('#simCtr').value) || 0;

  // Sync ROAS display input
  if (document.activeElement !== $('#roasTargetVal')) {
    $('#roasTargetVal').value = Number(roasTarget).toFixed(1);
  }

  // Break-even ROAS = 1 / (margin / 100)
  const marginDec = margin / 100;
  const breakeven = marginDec > 0 ? (1 / marginDec) : 0;

  // --- Auto-adjust CPC + Impressions when ROAS target changes ---
  if (fromRoasSlider && roasTarget > 0 && cvr > 0 && ticket > 0 && breakeven > 0) {
    _roasDriving = true;

    // 1. Adjust CPC to achieve target ROAS
    const revPerClick = ticket * (cvr / 100);
    const idealCpc = revPerClick / roasTarget;
    const clampedCpc = Math.max(0.1, Math.min(10, parseFloat(idealCpc.toFixed(2))));
    $('#simCpc').value = clampedCpc;
    $('#simCpcVal').value = clampedCpc.toFixed(2);

    // 2. Adjust Impressions based on ML Ads selectivity curve
    const ratio = roasTarget / breakeven;
    const multiplier = mlImpMultiplier(ratio);
    const adjustedImp = Math.max(100, Math.min(500000, Math.round(_baseImpressions * multiplier)));
    $('#simImp').value = adjustedImp;
    $('#simImpVal').value = adjustedImp;

    renderSim();
    _roasDriving = false;
  }

  // Re-read current imp after potential adjustment
  const imp = parseFloat($('#simImp').value) || 0;

  // Display breakeven
  $('#roasBreakevenVal').textContent = breakeven > 0 ? fmtNum(breakeven, 2) + 'x' : '—';

  // Status badge
  const statusEl = $('#roasBreakevenStatus');
  statusEl.className = 'breakeven-status';
  if (breakeven <= 0) {
    statusEl.textContent = '—';
  } else if (roasTarget > breakeven * 1.05) {
    statusEl.classList.add('above');
    statusEl.textContent = '✓ Acima — Lucrando';
  } else if (roasTarget < breakeven * 0.95) {
    statusEl.classList.add('below');
    statusEl.textContent = '✗ Abaixo — Prejuízo';
  } else {
    statusEl.classList.add('at');
    statusEl.textContent = '≈ No equilíbrio';
  }

  // Impact metrics
  const currentCpc = parseFloat($('#simCpc').value) || 0;
  const revPerClick = ticket * (cvr / 100);
  const maxCpc = roasTarget > 0 ? revPerClick / roasTarget : 0;
  $('#roasCpcMax').textContent = maxCpc > 0 ? 'R$ ' + fmtNum(maxCpc, 2) : '—';

  // Max daily spend
  const clicks = imp * (ctr / 100);
  const maxDailySpend = clicks * maxCpc;
  $('#roasMaxSpend').textContent = maxDailySpend > 0 ? fmtBRL(maxDailySpend / 30) : '—';

  // Profit per sale
  const spendPerSale = roasTarget > 0 ? ticket / roasTarget : 0;
  const profitPerSale = (ticket * marginDec) - spendPerSale;
  const profitEl = $('#roasProfitPerSale');
  profitEl.textContent = 'R$ ' + fmtNum(profitPerSale, 2);
  profitEl.style.color = profitPerSale > 0 ? 'var(--great)' : profitPerSale < 0 ? 'var(--bad)' : 'var(--text)';

  // Effective margin
  const effMargin = ticket > 0 ? (profitPerSale / ticket) * 100 : 0;
  const effEl = $('#roasEffMargin');
  effEl.textContent = fmtNum(effMargin, 1) + '%';
  effEl.style.color = effMargin > 0 ? 'var(--great)' : effMargin < 0 ? 'var(--bad)' : 'var(--text)';

  // Impression change %
  const impChange = _baseImpressions > 0 ? ((imp - _baseImpressions) / _baseImpressions * 100) : 0;
  const impSign = impChange > 0 ? '+' : '';

  // Verdict with traffic impact
  const verdictEl = $('#roasVerdict');
  verdictEl.className = 'roas-verdict show';

  if (margin <= 0 || roasTarget <= 0) {
    verdictEl.className = 'roas-verdict';
    return;
  }

  const trafficNote = Math.abs(impChange) > 1
    ? ` Tráfego: <strong>${impSign}${fmtNum(impChange,0)}%</strong> (${fmtNum(imp,0)} impressões).`
    : '';

  if (roasTarget > breakeven * 1.05) {
    const ratio = roasTarget / breakeven;
    if (ratio > 5) {
      verdictEl.classList.add('neutral');
      verdictEl.innerHTML = `<strong>⚠ Campanha quase pausada.</strong> ROAS ${fmtNum(roasTarget,1)}x é muito acima do equilíbrio (${fmtNum(breakeven,2)}x). O algoritmo será tão seletivo que quase nenhuma impressão será gerada.${trafficNote} Considere reduzir para maximizar volume com lucro.`;
    } else {
      verdictEl.classList.add('positive');
      verdictEl.innerHTML = `<strong>✓ Cenário saudável.</strong> Com ROAS ${fmtNum(roasTarget,1)}x, CPC ajustado para <strong>R$ ${fmtNum(currentCpc,2)}</strong>. Cada venda gera <strong>R$ ${fmtNum(profitPerSale,2)}</strong> de lucro (margem efetiva ${fmtNum(effMargin,1)}%).${trafficNote}`;
    }
  } else if (roasTarget <= breakeven * 0.95) {
    verdictEl.classList.add('negative');
    verdictEl.innerHTML = `<strong>✗ Estratégia agressiva — prejuízo por venda.</strong> ROAS ${fmtNum(roasTarget,1)}x está abaixo do equilíbrio (${fmtNum(breakeven,2)}x). Cada venda perde <strong>R$ ${fmtNum(Math.abs(profitPerSale),2)}</strong>, mas o volume de tráfego aumenta.${trafficNote} Use para lançamentos ou ganhar posicionamento.`;
  } else {
    verdictEl.classList.add('neutral');
    verdictEl.innerHTML = `<strong>≈ No limite do equilíbrio.</strong> ROAS ${fmtNum(roasTarget,1)}x ≈ equilíbrio (${fmtNum(breakeven,2)}x). Lucro mínimo de R$ ${fmtNum(profitPerSale,2)} por venda.${trafficNote} Aumente para garantir margem de segurança.`;
  }
}

// ROAS slider/input → adjusts CPC + Impressions → recalculates everything
$('#roasTarget').addEventListener('input', () => {
  renderRoasTarget(true);
});
$('#roasTargetVal').addEventListener('input', (e) => {
  $('#roasTarget').value = e.target.value;
  renderRoasTarget(true);
});

// Initial render
renderRoasTarget();

// ===== Meta =====
$('#btnGoal').onclick = () => {
  const gRev = parseFloat($('#goalRevenue').value) || 0;
  const gProfit = parseFloat($('#goalProfit').value) || 0;
  const r = compute(gatherInputs());
  const el = $('#goalResults');

  if (!hasData(r) && (!gRev && !gProfit)) {
    el.innerHTML = '<b>Preencha a calculadora e defina uma meta.</b>';
    el.classList.add('show');
    return;
  }

  let html = '';
  if (gRev > 0 && r.ticket > 0 && r.cvr > 0 && r.ctr > 0) {
    const salesNeeded = gRev / r.ticket;
    const clicksNeeded = salesNeeded / (r.cvr / 100);
    const impsNeeded = clicksNeeded / (r.ctr / 100);
    const spendNeeded = clicksNeeded * r.cpc;
    html += `<div style="margin-bottom:10px;"><b>🎯 Para atingir receita de ${fmtBRL(gRev)}:</b><br/>
      • Vendas necessárias: <b>${fmtNum(salesNeeded, 0)}</b><br/>
      • Cliques necessários: <b>${fmtNum(clicksNeeded, 0)}</b><br/>
      • Impressões necessárias: <b>${fmtNum(impsNeeded, 0)}</b><br/>
      • Investimento estimado: <b>${fmtBRL(spendNeeded)}</b><br/>
      • ROAS previsto: <b>${fmtNum(gRev / spendNeeded, 2)}x</b></div>`;
  }

  if (gProfit > 0 && r.margin > 0) {
    const m = r.margin / 100;
    if (r.cpc > 0 && r.cvr > 0 && r.ticket > 0) {
      // profit per click = ticket * cvr * margin - cpc
      const profitPerClick = r.ticket * (r.cvr / 100) * m - r.cpc;
      if (profitPerClick > 0) {
        const clicksNeeded = gProfit / profitPerClick;
        const salesNeeded = clicksNeeded * (r.cvr / 100);
        const revNeeded = salesNeeded * r.ticket;
        const spendNeeded = clicksNeeded * r.cpc;
        html += `<div><b>💰 Para atingir lucro líquido de ${fmtBRL(gProfit)}:</b><br/>
          • Receita necessária: <b>${fmtBRL(revNeeded)}</b><br/>
          • Vendas: <b>${fmtNum(salesNeeded, 0)}</b><br/>
          • Investimento: <b>${fmtBRL(spendNeeded)}</b></div>`;
      } else {
        html += `<div style="color: var(--bad);"><b>⚠️ Impossível atingir a meta:</b> com os parâmetros atuais, cada clique gera prejuízo de ${fmtBRL(-profitPerClick)}.</div>`;
      }
    }
  }

  if (!html) html = '<b>Preencha margem, CTR, CVR, CPC e ticket na Calculadora antes.</b>';
  el.innerHTML = html;
  el.classList.add('show');
};

// ===== Comparar cenários =====
function renderCompareSelector() {
  const list = loadScenarios();
  const elA = $('#selectCompareA');
  const elB = $('#selectCompareB');
  if (!elA || !elB) return;
  if (list.length === 0) { 
    elA.innerHTML = '<option value="">Crie e salve um cenário</option>';
    elB.innerHTML = '<option value="">Crie e salve um cenário</option>';
    return; 
  }
  
  const opts = list.map((s, i) => `<option value="${i}">${s.name}</option>`).join('');
  elA.innerHTML = opts;
  elB.innerHTML = opts;
  
  if (list.length >= 2) {
    elA.value = list.length - 2;
    elB.value = list.length - 1;
  } else {
    elA.value = 0;
    elB.value = 0;
  }
  
  elA.onchange = renderCompareTable;
  elB.onchange = renderCompareTable;
}

function renderCompareTable() {
  const list = loadScenarios();
  const elA = $('#selectCompareA');
  const elB = $('#selectCompareB');
  const tbl = $('#compareTable');
  
  if (!elA || !elB || !elA.value || !elB.value || list.length === 0) { 
    tbl.innerHTML = '<tr><td class="empty">Nenhum cenário salvo suficiente para comparar.</td></tr>'; 
    return; 
  }

  const iA = parseInt(elA.value);
  const iB = parseInt(elB.value);
  const chosen = [list[iA], list[iB]].filter(Boolean);
  
  if (chosen.length === 0) { tbl.innerHTML = ''; return; }

  const rows = [
    ['Margem', 'input.margin', v => fmtPct(v, 1)],
    ['Impressões', 'input.impressions', v => fmtNum(v)],
    ['Cliques', 'input.clicks', v => fmtNum(v)],
    ['Vendas', 'input.sales', v => fmtNum(v)],
    ['Receita', 'input.revenue', v => fmtBRL(v)],
    ['Investimento', 'input.adSpend', v => fmtBRL(v)],
    ['CTR', 'r.ctr', v => fmtPct(v)],
    ['CVR', 'r.cvr', v => fmtPct(v)],
    ['CPC', 'r.cpc', v => fmtBRL(v)],
    ['CPA', 'r.cpa', v => fmtBRL(v)],
    ['Ticket médio', 'r.ticket', v => fmtBRL(v)],
    ['ROAS', 'r.roas', v => fmtNum(v, 2) + 'x'],
    ['ACoS', 'r.acos', v => fmtPct(v)],
    ['TACoS', 'r.tacos', v => fmtPct(v)],
    ['CPM', 'r.cpm', v => fmtBRL(v)],
    ['Lucro líquido', 'r.lucroLiquido', v => fmtBRL(v)],
    ['Margem operacional', 'r.margemOp', v => fmtPct(v)],
    ['ROAS alvo', 'r.roasAlvo', v => v > 0 ? fmtNum(v, 2) + 'x' : '—']
  ];
  const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);

  let html = '<thead><tr><th>Métrica</th>';
  chosen.forEach(c => html += `<th>${c.name}</th>`);
  if (chosen.length === 2 && chosen[0] !== chosen[1]) html += '<th>Dif. (B - A)</th>';
  html += '</tr></thead><tbody>';
  
  rows.forEach(([label, path, fmt]) => {
    html += `<tr><td><b>${label}</b></td>`;
    const vA = getPath(chosen[0], path) || 0;
    const vB = getPath(chosen[1], path) || 0;
    html += `<td>${fmt(vA)}</td>`;
    if (chosen.length > 1) {
      if (chosen[0] !== chosen[1]) {
        html += `<td>${fmt(vB)}</td>`;
        const diff = vB - vA;
        let diffClass = diff > 0 ? 'good' : (diff < 0 ? 'bad' : 'neutral');
        let sign = diff > 0 ? '+' : '';
        if (['CPC', 'CPA', 'ACoS', 'TACoS', 'CPM'].includes(label) || (label==='Investimento' && diff>0)) {
          diffClass = diff > 0 ? 'bad' : (diff < 0 ? 'good' : 'neutral');
        }
        html += `<td class="delta-cell ${diffClass}"><b>${sign}${fmt(diff)}</b></td>`;
      } else {
        html += `<td>${fmt(vB)}</td>`;
      }
    }
    html += '</tr>';
  });
  html += '</tbody>';
  tbl.innerHTML = html;

  const ctxRadar = $('#chartCompareRadar').getContext('2d');
  if (chartCompareRadar) chartCompareRadar.destroy();
  
  const getScores = (c) => {
    const sCtr = classify('ctr', c.r.ctr).score || 0;
    const sCvr = classify('cvr', c.r.cvr).score || 0;
    const sRoas = classify('roas', c.r.roas, c.r.margin).score || 0;
    let sAcos = 0; if (c.r.roas > 0) sAcos = Math.min(100, Math.max(0, (c.r.breakEven / c.r.roas) * 50));
    return [sCtr, sCvr, sRoas, sAcos];
  };

  const dsData = [
    { label: chosen[0].name, data: getScores(chosen[0]), backgroundColor: 'rgba(52,131,250,.2)', borderColor: '#3483fa', pointBackgroundColor: '#3483fa' }
  ];
  if (chosen.length > 1 && chosen[1] !== chosen[0]) {
    dsData.push({ label: chosen[1].name, data: getScores(chosen[1]), backgroundColor: 'rgba(39,196,122,.2)', borderColor: '#27c47a', pointBackgroundColor: '#27c47a' });
  }

  chartCompareRadar = new Chart(ctxRadar, {
    type: 'radar',
    data: {
      labels: ['CTR Score', 'CVR Score', 'ROAS Score', 'Eficiência ACoS'],
      datasets: dsData
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { color: getCssVar('--muted'), backdropColor: 'transparent' },
          grid: { color: getCssVar('--border') },
          angleLines: { color: getCssVar('--border') },
          pointLabels: { color: getCssVar('--text'), font: { family: 'Inter', weight: '600' } }
        }
      },
      plugins: { legend: { labels: { color: getCssVar('--text'), usePointStyle: true } } }
    }
  });
}

// ===== Benchmarks derivados (ROAS e ACoS) =====
function renderBenchDerived() {
  const el = $('#benchDerived');
  if (!el) return;
  const margin = parseFloat($('#margin').value) || 0;

  if (margin <= 0) {
    el.innerHTML = `
      <div class="bench-card">
        <h3>ROAS <small>= 1 ÷ margem</small></h3>
        <p class="hint" style="margin:6px 0 0 0;">Informe a margem na Calculadora para ver as faixas.</p>
      </div>
      <div class="bench-card">
        <h3>ACoS <small>= margem</small></h3>
        <p class="hint" style="margin:6px 0 0 0;">Informe a margem na Calculadora para ver as faixas.</p>
      </div>
    `;
    return;
  }

  const m = margin / 100;
  const be = 1 / m;
  const roasRows = [
    { label: 'Ruim',  cls: 'bad',   range: `< ${fmtNum(be, 2)}x` },
    { label: 'Fraco', cls: 'weak',  range: `${fmtNum(be, 2)}x – ${fmtNum(be * 1.5, 2)}x` },
    { label: 'Bom',   cls: 'good',  range: `${fmtNum(be * 1.5, 2)}x – ${fmtNum(be * 2, 2)}x` },
    { label: 'Ótimo', cls: 'great', range: `> ${fmtNum(be * 2, 2)}x` }
  ];
  const acosRows = [
    { label: 'Ótimo', cls: 'great', range: `< ${fmtNum(margin * 0.4, 1)}%` },
    { label: 'Bom',   cls: 'good',  range: `${fmtNum(margin * 0.4, 1)}% – ${fmtNum(margin * 0.7, 1)}%` },
    { label: 'Fraco', cls: 'weak',  range: `${fmtNum(margin * 0.7, 1)}% – ${fmtNum(margin, 1)}%` },
    { label: 'Ruim',  cls: 'bad',   range: `> ${fmtNum(margin, 1)}%` }
  ];
  const rowHtml = (r) => `
    <div class="bench-row">
      <span class="pill ${r.cls}">${r.label}</span>
      <span class="range-label">${r.range}</span>
      <input type="text" class="bench-input" value="auto" disabled />
    </div>`;
  el.innerHTML = `
    <div class="bench-card">
      <h3>ROAS <small>equilíbrio = ${fmtNum(be, 2)}x</small></h3>
      ${roasRows.map(rowHtml).join('')}
    </div>
    <div class="bench-card">
      <h3>ACoS <small>equilíbrio = ${fmtNum(margin, 1)}%</small></h3>
      ${acosRows.map(rowHtml).join('')}
    </div>
  `;
}

// ===== Editor de Benchmarks =====
function renderBenchEditor() {
  const grid = $('#benchGrid');
  grid.innerHTML = Object.keys(BENCH_META).map(k => {
    const meta = BENCH_META[k];
    const t = thresholds[k];
    const labels = meta.direction === 'higher'
      ? ['Ruim', 'Fraco', 'Bom', 'Ótimo']
      : ['Ótimo', 'Bom', 'Fraco', 'Ruim'];
    const classes = meta.direction === 'higher'
      ? ['bad', 'weak', 'good', 'great']
      : ['great', 'good', 'weak', 'bad'];
    const u = meta.unit;
    const higher = meta.direction === 'higher';
    const rows = [
      { range: higher ? `< ${t[0]}${u}` : `< ${t[0]}${u}`,
        input: { idx: 0, val: t[0] }, label: labels[0], cls: classes[0] },
      { range: `${t[0]}${u} – ${t[1]}${u}`,
        input: { idx: 1, val: t[1] }, label: labels[1], cls: classes[1] },
      { range: `${t[1]}${u} – ${t[2]}${u}`,
        input: { idx: 2, val: t[2] }, label: labels[2], cls: classes[2] },
      { range: `> ${t[2]}${u}`,
        input: null, label: labels[3], cls: classes[3] }
    ];

    const hint = meta.direction === 'higher'
      ? 'quanto maior, melhor'
      : 'quanto menor, melhor';

    return `
      <div class="bench-card" data-metric="${k}">
        <h3>${meta.title} <small>${hint}</small></h3>
        ${rows.map(r => `
          <div class="bench-row">
            <span class="pill ${r.cls}">${r.label}</span>
            <span class="range-label">${r.range}</span>
            ${r.input
              ? `<input type="number" class="bench-input" data-metric="${k}" data-idx="${r.input.idx}" value="${r.input.val}" step="0.1" min="0" />`
              : `<input type="text" class="bench-input" value="—" disabled />`}
          </div>
        `).join('')}
      </div>
    `;
  }).join('');

  grid.querySelectorAll('input.bench-input:not([disabled])').forEach(inp => {
    inp.addEventListener('input', onBenchInput);
    inp.addEventListener('change', onBenchChange);
  });
}

function onBenchInput(e) {
  const metric = e.target.dataset.metric;
  const idx = parseInt(e.target.dataset.idx);
  const val = parseFloat(e.target.value);
  if (!isFinite(val) || val < 0) return;
  thresholds[metric][idx] = val;
  BENCH = buildAllBench(thresholds);
  render();
}

function onBenchChange(e) {
  const metric = e.target.dataset.metric;
  const idx = parseInt(e.target.dataset.idx);
  const val = parseFloat(e.target.value);
  if (!isFinite(val) || val < 0) return;

  const arr = thresholds[metric].slice();
  arr[idx] = val;
  // mantém monotonia: t0 < t1 < t2
  if (idx === 0 && arr[0] > arr[1]) arr[1] = arr[0] + 0.1;
  if (idx === 1) {
    if (arr[1] < arr[0]) arr[1] = arr[0] + 0.1;
    if (arr[1] > arr[2]) arr[2] = arr[1] + 0.1;
  }
  if (idx === 2 && arr[2] < arr[1]) arr[2] = arr[1] + 0.1;

  thresholds[metric] = arr;
  BENCH = buildAllBench(thresholds);
  saveThresholds();
  renderBenchEditor();
  render();
}

$('#btnBenchReset').onclick = () => {
  thresholds = defaultThresholds();
  BENCH = buildAllBench(thresholds);
  saveThresholds();
  renderBenchEditor();
  render();
  toast('Benchmarks restaurados');
};

$('#btnBenchExport').onclick = () => {
  const blob = new Blob([JSON.stringify(thresholds, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'benchmarks-ml-ads.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Benchmarks exportados');
};

$('#benchImportFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      const out = defaultThresholds();
      let ok = false;
      Object.keys(BENCH_META).forEach(k => {
        if (Array.isArray(data[k]) && data[k].length === 3 && data[k].every(n => typeof n === 'number' && isFinite(n) && n >= 0)) {
          out[k] = data[k];
          ok = true;
        }
      });
      if (!ok) { toast('Arquivo inválido'); return; }
      thresholds = out;
      BENCH = buildAllBench(thresholds);
      saveThresholds();
      renderBenchEditor();
      render();
      toast('Benchmarks importados');
    } catch {
      toast('Erro ao ler arquivo');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

// ===== Exportar CSV =====
$('#btnExport').onclick = () => {
  const list = loadScenarios();
  if (list.length === 0) { toast('Nenhum cenário salvo'); return; }
  const headers = ['Nome', 'Data', 'Margem%', 'Impressões', 'Cliques', 'Vendas', 'Receita', 'ReceitaTotal', 'Invest', 'CTR%', 'CVR%', 'ROAS', 'ACoS%', 'TACoS%', 'CPC', 'CPA', 'Ticket', 'LucroLiq', 'MargemOp%'];
  const lines = [headers.join(';')];
  list.forEach(s => {
    lines.push([
      s.name, s.date.split('T')[0],
      s.input.margin, s.input.impressions, s.input.clicks, s.input.sales,
      s.input.revenue, s.input.totalRevenue, s.input.adSpend,
      s.r.ctr.toFixed(2), s.r.cvr.toFixed(2), s.r.roas.toFixed(2),
      s.r.acos.toFixed(2), s.r.tacos.toFixed(2),
      s.r.cpc.toFixed(2), s.r.cpa.toFixed(2),
      s.r.ticket.toFixed(2), s.r.lucroLiquido.toFixed(2), s.r.margemOp.toFixed(2)
    ].join(';'));
  });
  const blob = new Blob(["\ufeff" + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cenarios-ml-ads.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV exportado');
};

$('#btnPrint').onclick = () => window.print();

// ===== Compartilhar Cenário via Link =====
$('#btnShare').onclick = () => {
  const data = gatherInputs();
  if (!hasData(data)) {
    toast('Preencha os dados primeiro');
    return;
  }
  
  // Como gatherInputs só retorna números, JSON.stringify é seguro para btoa direto (sem unicode issues).
  const enc = btoa(JSON.stringify(data));
  const url = window.location.origin + window.location.pathname + '?d=' + enc;
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      toast('Link copiado para a área de transferência!');
    }).catch(() => {
      prompt('Link gerado (copie abaixo):', url);
    });
  } else {
    // Fallback se clipboard API bloqueada ou insegura
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    toast('Link copiado para a área de transferência!');
  }
};

// ===== Toast =====
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.__toastT);
  window.__toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

// ===== Eventos =====
['#margin', '#impressions', '#clicks', '#sales', '#revenue', '#totalRevenue', '#adSpend']
  .forEach(s => $(s).addEventListener('input', render));

// ===== Load from URL =====
function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const d = params.get('d');
  if (d) {
    try {
      const dec = JSON.parse(atob(d));
      ['margin', 'impressions', 'clicks', 'sales', 'revenue', 'totalRevenue', 'adSpend'].forEach(k => {
        if (dec[k] !== undefined && dec[k] !== null) {
          $(`#${k}`).value = dec[k] > 0 ? dec[k] : '';
        }
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      toast('Dados carregados do link');
    } catch(e) {
      console.warn("Invalid share link", e);
      toast('Link inválido ou corrompido');
    }
  }
}

// ===== Init =====
initClients();
thresholds = loadThresholds();
BENCH = buildAllBench(thresholds);
loadFromUrl();
renderClientBar();
renderBenchEditor();
render();
renderSim();
renderSaved();
renderCompareSelector();
