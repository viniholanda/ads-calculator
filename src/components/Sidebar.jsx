export default function Sidebar({ views, activeView, onViewChange, isOpen, onToggle }) {
  return (
    <aside className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-brand">
        <div className="sidebar-logo">M</div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">Mercado Ads</span>
          <span className="sidebar-brand-sub">Analytics Pro</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {views.map(v => (
          <button
            key={v.id}
            className={`sidebar-nav-item ${activeView === v.id ? 'active' : ''}`}
            onClick={() => onViewChange(v.id)}
            title={v.label}
          >
            <span className="material-symbols-outlined">{v.icon}</span>
            <span className="sidebar-nav-label">{v.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-toggle">
        <button className="sidebar-toggle-btn" onClick={onToggle} title={isOpen ? 'Recolher' : 'Expandir'}>
          <span className="material-symbols-outlined">
            {isOpen ? 'chevron_left' : 'chevron_right'}
          </span>
        </button>
      </div>
    </aside>
  );
}
