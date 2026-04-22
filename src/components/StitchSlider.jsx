import { useState, useRef } from 'react';

export default function StitchSlider({ label, value, onChange, min = 0, max = 100, step = 0.1, unit = '', displayValue }) {
  const display = displayValue !== undefined ? displayValue : `${value}${unit}`;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  function startEdit() {
    setDraft(String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    const parsed = parseFloat(draft.replace(',', '.'));
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      onChange(clamped);
    }
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditing(false);
  }

  return (
    <div className="input-group" style={{ gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label className="input-label">{label}</label>
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            value={draft}
            min={min}
            max={max}
            step={step}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            style={{
              fontFamily: 'var(--font-kpi)',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--primary)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--primary)',
              borderRadius: '4px',
              padding: '1px 6px',
              width: '80px',
              textAlign: 'right',
              outline: 'none',
              letterSpacing: '-0.01em',
            }}
          />
        ) : (
          <span
            onClick={startEdit}
            title="Clique para editar"
            style={{
              fontFamily: 'var(--font-kpi)',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--primary)',
              letterSpacing: '-0.01em',
              cursor: 'text',
              borderBottom: '1px dashed rgba(255,230,0,0.4)',
              paddingBottom: '1px',
            }}
          >
            {display}
          </span>
        )}
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
