import { useState, useRef, useEffect } from 'react';

const FIELD_STYLE = {
  width: '100%',
  background: 'var(--bg-sunken)',
  border: '1px solid var(--border-tonal)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: 13,
  padding: '7px 10px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

function MentoradoForm({ initial = {}, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ name: '', email: '', storeUrl: '', niche: '', notes: '', ...initial });
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Nome *
        </label>
        <input ref={nameRef} required autoComplete="off" style={FIELD_STYLE} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: João Silva" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            E-mail
          </label>
          <input type="email" autoComplete="off" style={FIELD_STYLE} value={form.email} onChange={e => set('email', e.target.value)} placeholder="joao@email.com" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Nicho
          </label>
          <input autoComplete="off" style={FIELD_STYLE} value={form.niche} onChange={e => set('niche', e.target.value)} placeholder="Ex: Pet Shop, Moda, etc." />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          URL da Loja / Anúncio
        </label>
        <input autoComplete="off" style={FIELD_STYLE} value={form.storeUrl} onChange={e => set('storeUrl', e.target.value)} placeholder="https://..." />
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Anotações
        </label>
        <textarea rows={3} style={{ ...FIELD_STYLE, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observações sobre o mentorado..." />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim()}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

function ManageModal({ clients, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const startEdit = (c) => setEditingId(c.id);

  const confirmEdit = async (id, form) => {
    setSaving(true);
    await clients.updateClient(id, form);
    setSaving(false);
    setEditingId(null);
  };

  const handleDelete = (id) => clients.deleteClient(id);

  const editingClient = editingId ? clients.clients.find(c => c.id === editingId) : null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)' }}>manage_accounts</span>
            Gerenciar Mentorados
          </span>
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {editingClient ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Editando: <strong style={{ color: 'var(--text-primary)' }}>{editingClient.name}</strong>
            </p>
            <MentoradoForm
              initial={editingClient}
              saving={saving}
              onSave={(form) => confirmEdit(editingClient.id, form)}
              onCancel={() => setEditingId(null)}
            />
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clients.clients.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border-tonal)',
                  background: c.id === clients.activeId ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: c.id === clients.activeId ? 700 : 400 }}>
                    {c.name}
                    {c.id === clients.activeId && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ativo
                      </span>
                    )}
                  </div>
                  {(c.email || c.niche) && (
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                      {[c.email, c.niche].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {c.notes && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>{c.notes}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px' }} title="Editar" onClick={() => startEdit(c)}>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AddModal({ clients, onClose }) {
  const [saving, setSaving] = useState(false);

  const handleSave = async (form) => {
    setSaving(true);
    await clients.addClient(form.name, { email: form.email, storeUrl: form.storeUrl, niche: form.niche, notes: form.notes });
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)' }}>person_add</span>
            Novo Mentorado
          </span>
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <MentoradoForm saving={saving} onSave={handleSave} onCancel={onClose} />
      </div>
    </div>
  );
}

export default function Header({ clients, activeViewLabel, onMenuToggle }) {
  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState(false);

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
          {clients.loading ? (
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Carregando...</span>
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

      {adding && <AddModal clients={clients} onClose={() => setAdding(false)} />}
      {managing && <ManageModal clients={clients} onClose={() => setManaging(false)} />}
    </>
  );
}
