export default function SunkenInput({ label, value, onChange, placeholder, prefix, suffix, type = 'number', id }) {
  const wrapperClass = prefix ? 'input-with-prefix' : suffix ? 'input-with-suffix' : '';

  return (
    <div className="input-group">
      {label && <label className="input-label" htmlFor={id}>{label}</label>}
      <div className={wrapperClass}>
        {prefix && <span className="prefix">{prefix}</span>}
        <input
          id={id}
          type={type}
          className="sunken-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || '0'}
          step="any"
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
    </div>
  );
}
