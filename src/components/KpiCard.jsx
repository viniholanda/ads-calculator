import { fmtBRL, fmtPct, fmtNum } from '../utils/formatters';

export default function KpiCard({ label, value, formula, badge, icon, format }) {
  let display = value;
  if (format === 'brl')    display = fmtBRL(value);
  if (format === 'pct')    display = fmtPct(value);
  if (format === 'pct1')   display = fmtPct(value, 1);
  if (format === 'roas')   display = fmtNum(value, 2) + 'x';
  if (format === 'num')    display = fmtNum(value);

  const badgeClass = badge?.class ? `badge badge-${badge.class}` : '';

  return (
    <div className="kpi-card">
      <div className="kpi-label">
        {icon && <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>{icon}</span>}
        {label}
        {badge && badge.label && badge.label !== '—' && (
          <span className={badgeClass}>{badge.label}</span>
        )}
      </div>
      <div className="kpi-value">{display}</div>
      {formula && <div className="kpi-formula">{formula}</div>}
    </div>
  );
}
