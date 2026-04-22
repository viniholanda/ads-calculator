// ================================================================
// Formatting Utilities — Mercado Ads Pro
// ================================================================

export const fmtBRL = (v) => {
  if (!isFinite(v) || isNaN(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const fmtNum = (v, d = 0) => {
  if (!isFinite(v) || isNaN(v)) return '0';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
};

export const fmtPct = (v, d = 2) => {
  if (!isFinite(v) || isNaN(v)) return '0%';
  return `${v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
};
