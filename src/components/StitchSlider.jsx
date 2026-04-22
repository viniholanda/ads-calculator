export default function StitchSlider({ label, value, onChange, min = 0, max = 100, step = 0.1, unit = '', displayValue }) {
  const display = displayValue !== undefined ? displayValue : `${value}${unit}`;

  return (
    <div className="input-group" style={{ gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label className="input-label">{label}</label>
        <span style={{
          fontFamily: 'var(--font-kpi)',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--primary)',
          letterSpacing: '-0.01em'
        }}>
          {display}
        </span>
      </div>
      <input
        type="range"
        className="stitch-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
