import { useState, useRef, useEffect } from 'react';

function ManageModal({ clients, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const editRef = useRef(null);

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus();
  }, [editingId]);

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditName(c.name);
  };

  const confirmEdit = () => {
    const name = editName.trim();
    if (name && editingId) clients.renameClient(editingId, name);
    setEditingId(null);
    setEditName('');
  };

  const handleEditKey = (e) => {
    if (e.key === 'Enter') confirmEdit();
    if (e.key === 'Escape') { setEditingId(null); setEditName(''); }
  };

  const handleDelete = (id) => {
    clients.deleteClient(id);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <span className="modal-title" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)' }}>manage_accounts</span>
            Gerenciar Mentorados
          </span>
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clients.clients.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border-tonal)',
                background: c.id === clients.activeId ? 'var(--bg-elevated)' : 'var(--bg-surface)',
              }}
            >
              {editingId === c.id ? (
                <>
                  <input
                    ref={editRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleEditKey}
                    autoComplete="off"
                    style={{
                      flex: 1,
                      background: 'var(--bg-sunken)',
                      border: '1px solid var(--border-active)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      padding: '4px 8px',
                      outline: 'none',
                    }}
                  />
                  <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={confirmEdit}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setEditingId(null); setEditName(''); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                  </button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)', fontWeight: c.id === clients.activeId ? 600 : 400 }}>
                    {c.name}
                    {c.id === clients.activeId && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ativo
                      </span>
                    )}
                  </span>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px 8px' }}
                    title="Renomear"
                    onClick={() => startEdit(c)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px 8px', color: clients.clients.length <= 1 ? 'var(--text-dim)' : undefined }}
                    title={clients.clients.length <= 1 ? 'Não é possível excluir o único mentorado' : 'Excluir'}
                    disabled={clients.clients.length <= 1}
                    onClick={() => handleDelete(c.id)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Header({ clients, activeViewLabel, onMenuToggle }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [managing, setManaging] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus();
  }, [adding]);

  const handleAdd = () => {
    const name = newName.trim();
    if (name) clients.addClient(name);
    setAdding(false);
    setNewName('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') { setAdding(false); setNewName(''); }
  };

  return (
    <>
      <header className="header">
        <div className="header-left">
          <button className="header-menu-btn" onClick={onMenuToggle}>
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="header-title">{activeViewLabel}</h1>
        </div>
        <div className="header-right">
          {adding ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                ref={inputRef}
                className="client-select"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                placeholder="Nome do mentorado"
                style={{ minWidth: 160 }}
              />
              <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={handleAdd}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
              </button>
              <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => { setAdding(false); setNewName(''); }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            </div>
          ) : (
            <>
              <select
                className="client-select"
                value={clients.activeId}
                onChange={(e) => clients.switchClient(e.target.value)}
              >
                {clients.clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                className="btn btn-ghost"
                style={{ padding: '6px 10px' }}
                title="Gerenciar mentorados"
                onClick={() => setManaging(true)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>manage_accounts</span>
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setAdding(true)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                Novo
              </button>
            </>
          )}
        </div>
      </header>

      {managing && (
        <ManageModal clients={clients} onClose={() => setManaging(false)} />
      )}
    </>
  );
}
