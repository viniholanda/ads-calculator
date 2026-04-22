// ================================================================
// Financial Calculation Engine — Mercado Ads Pro
// Ported faithfully from legacy/app.js
// ================================================================

// ── Benchmark Metadata ──
export const BENCH_META = {
  ctr: { title: 'CTR', unit: '%', direction: 'higher', defaults: [0.5, 1, 2] },
  cvr: { title: 'CVR', unit: '%', direction: 'higher', defaults: [1, 1.5, 3] }
};

export function buildBench(thresholds, direction) {
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

export function defaultThresholds() {
  const t = {};
  Object.keys(BENCH_META).forEach(k => t[k] = BENCH_META[k].defaults.slice());
  return t;
}

export function buildAllBench(t) {
  const out = {};
  Object.keys(BENCH_META).forEach(k => {
    out[k] = buildBench(t[k], BENCH_META[k].direction);
  });
  return out;
}

// ── Classifier ──
export function classify(type, v, margin, bench) {
  if (v === null || v === undefined || isNaN(v)) return { label: '—', class: '', score: 0 };

  if (type === 'roas') {
    const m = (margin || 0) / 100;
    if (m <= 0 || v <= 0) return { label: '—', class: '', score: 0 };
    const be = 1 / m;
    if (v < be)       return { label: 'Ruim',  class: 'bad',   score: 25 };
    if (v < be * 1.5) return { label: 'Fraco', class: 'weak',  score: 50 };
    if (v < be * 2)   return { label: 'Bom',   class: 'good',  score: 80 };
    return                   { label: 'Ótimo', class: 'great', score: 100 };
  }

  if (type === 'acos') {
    const m = margin || 0;
    if (m <= 0 || v <= 0) return { label: '—', class: '', score: 0 };
    if (v > m)       return { label: 'Ruim',  class: 'bad',   score: 25 };
    if (v > m * 0.7) return { label: 'Fraco', class: 'weak',  score: 50 };
    if (v > m * 0.4) return { label: 'Bom',   class: 'good',  score: 80 };
    return                  { label: 'Ótimo', class: 'great', score: 100 };
  }

  if (type === 'tacos') {
    const m = margin || 0;
    if (m <= 0 || v <= 0) return { label: '—', class: '', score: 0 };
    if (v > m)       return { label: 'Ruim',  class: 'bad',   score: 25 };
    if (v > m * 0.7) return { label: 'Fraco', class: 'weak',  score: 50 };
    if (v > m * 0.4) return { label: 'Bom',   class: 'good',  score: 80 };
    return                  { label: 'Ótimo', class: 'great', score: 100 };
  }

  if (type === 'margemOp') {
    if (v <= 0)  return { label: 'Negativa', class: 'bad',   score: 25 };
    if (v < 5)   return { label: 'Fraca',    class: 'weak',  score: 50 };
    if (v < 15)  return { label: 'Boa',      class: 'good',  score: 80 };
    return              { label: 'Ótima',    class: 'great', score: 100 };
  }

  if (!bench || !bench[type]) return { label: '—', class: '', score: 0 };
  for (const b of bench[type]) {
    if (v < b.max) return b;
  }
  return bench[type][bench[type].length - 1];
}

// ── Core Compute ──
export function compute(data) {
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
  const acosBE = margin || 0;
  const roasAlvo = breakEven > 0 ? breakEven * 1.2 : 0;
  const lucroPorClique = clicks > 0 ? lucroLiquido / clicks : 0;

  return {
    ctr, cvr, cpc, cpa, cpm, ticket, roas, acos, tacos,
    lucroBruto, lucroLiquido, margemOp, breakEven, acosBE, roasAlvo, lucroPorClique,
    ...data
  };
}

// ── Has Data ──
export function hasData(r) {
  return r.impressions > 0 || r.clicks > 0 || r.sales > 0 || r.revenue > 0 || r.adSpend > 0;
}

// ── Health Score ──
export function computeHealthScore(bCtr, bCvr, bRoas) {
  return Math.round(((bCtr.score || 0) + (bCvr.score || 0) + (bRoas.score || 0)) / 3);
}

export function healthLabel(score) {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Bom';
  if (score >= 40) return 'Regular';
  if (score >= 25) return 'Fraco';
  return 'Crítico';
}

// ── Diagnostics Engine ──
export function generateDiagnostics(r) {
  const items = [];

  if (r.ctr > 1.5 && r.cvr < 3) {
    items.push({ level: 'critical', icon: '🚨', title: 'CTR alto + CVR baixo — Problema na página do produto', text: 'Seu anúncio atrai cliques, mas a página de vendas não converte. Revise: preço vs. concorrência, fotos, título, descrição, reputação/avaliações, frete, estoque.' });
  }
  if (r.ctr < 0.5 && r.cvr > 4) {
    items.push({ level: 'warning', icon: '🎯', title: 'CTR baixo — Anúncio pouco atrativo', text: 'Sua página converte bem, mas o anúncio não chama atenção. Teste títulos mais ricos em palavras-chave, novas imagens e destaque diferenciais.' });
  }
  if (r.roas > 0 && r.roas < r.breakEven) {
    items.push({ level: 'critical', icon: '💸', title: 'ROAS abaixo do equilíbrio — Prejuízo', text: `Seu ROAS é ${r.roas.toFixed(2)}x, mas precisaria ser ao menos ${r.breakEven.toFixed(2)}x para cobrir custos. Pause campanhas ruins, melhore segmentação ou aumente margem.` });
  }
  if (r.roas >= r.breakEven && r.roas < r.breakEven * 1.5) {
    items.push({ level: 'warning', icon: '⚠️', title: 'Rentabilidade marginal', text: 'Você está lucrando pouco acima do ponto de equilíbrio. Pequenas variações de CPC ou CVR podem te tirar do lucro.' });
  }
  if (r.roas >= r.breakEven * 2) {
    items.push({ level: 'ok', icon: '✅', title: 'Campanha muito rentável', text: 'Seu ROAS está bem acima do equilíbrio. Considere aumentar o investimento para escalar as vendas.' });
  }
  if (r.tacos > 0 && r.tacos > 20) {
    items.push({ level: 'warning', icon: '📊', title: 'TACoS elevado', text: `Você depende demais de ads (${r.tacos.toFixed(1)}% da receita total). Invista em SEO e marca para reduzir dependência.` });
  }
  if (r.tacos > 0 && r.tacos < 10 && r.totalRevenue > 0) {
    items.push({ level: 'info', icon: '🌱', title: 'Ads com baixo peso na receita total', text: 'Seu TACoS é baixo — seus ads geram vendas incrementais sem canibalizar o orgânico. Excelente sinal.' });
  }
  if (r.cpa > 0 && r.cpa > r.ticket * (r.margin / 100)) {
    items.push({ level: 'critical', icon: '🔥', title: 'CPA maior que lucro unitário', text: `Você gasta R$ ${r.cpa.toFixed(2)} para adquirir um cliente, mas cada venda só rende R$ ${(r.ticket * (r.margin / 100)).toFixed(2)} de lucro bruto.` });
  }
  if (r.acos > 0 && r.margin > 0 && r.acos > r.margin) {
    items.push({ level: 'critical', icon: '🧨', title: 'ACoS acima da margem — Ads drenam o lucro', text: `Seu ACoS (${r.acos.toFixed(1)}%) supera a margem do produto (${r.margin.toFixed(1)}%). Cada venda via Ads sai no prejuízo.` });
  }
  if (r.cpm > 0 && r.cpm > 60) {
    items.push({ level: 'warning', icon: '📡', title: 'CPM alto', text: `Custo por mil impressões de R$ ${r.cpm.toFixed(2)} está acima do usual para ML (R$ 10–50).` });
  }
  if (r.ctr > 2 && r.cvr >= 1.5) {
    items.push({ level: 'ok', icon: '🚀', title: 'Oportunidade de escala', text: `CTR ${r.ctr.toFixed(1)}% e CVR ${r.cvr.toFixed(1)}% estão ótimos. Aumente o orçamento 20–30% por semana monitorando ROAS.` });
  }
  if (r.impressions > 0 && r.impressions < 1000) {
    items.push({ level: 'info', icon: '📉', title: 'Volume de impressões baixo', text: 'Menos de 1.000 impressões limita a capacidade estatística. Considere ampliar palavras-chave, orçamento ou categorias.' });
  }

  if (items.length === 0) {
    items.push({ level: 'info', icon: 'ℹ️', title: 'Indicadores equilibrados', text: 'Nada crítico detectado. Continue monitorando e testando variações.' });
  }

  return items;
}

// ── Action Plan ──
export function generateActionPlan(r, bench) {
  const plan = [];
  const bCtr = classify('ctr', r.ctr, null, bench);
  const bCvr = classify('cvr', r.cvr, null, bench);
  const bRoas = classify('roas', r.roas, r.margin, bench);

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
    plan.push({ p: 'med', t: `Configurar ROAS Alvo da campanha em ${r.roasAlvo.toFixed(2)}x (20% acima do break-even de ${r.breakEven.toFixed(2)}x).` });
  }
  plan.push({ p: 'low', t: 'Monitorar semanalmente: CTR, CVR, ROAS e ajustar lances com base em dados.' });

  const order = { high: 0, med: 1, low: 2 };
  plan.sort((a, b) => order[a.p] - order[b.p]);
  return plan;
}

// ── Simulator Compute ──
export function computeSimulation(params) {
  const { ctr, cvr, cpc, ticket, margin, impressions } = params;
  const clicks = impressions * (ctr / 100);
  const sales = clicks * (cvr / 100);
  const spend = clicks * cpc;
  const rev = sales * ticket;
  const roas = spend > 0 ? rev / spend : 0;
  const acos = rev > 0 ? (spend / rev) * 100 : 0;
  const profit = rev * (margin / 100) - spend;
  const marOp = rev > 0 ? (profit / rev) * 100 : 0;

  return { clicks, sales, spend, rev, roas, acos, profit, marOp };
}
