import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : (window.location.port === '3000' ? 'http://localhost:3001/api' : `${window.location.origin}/api`)

const hdr = () => ({ Authorization: `Bearer ${localStorage.getItem('vf_token')}`, 'Content-Type': 'application/json' })

export default function AdminPanel({ onBack }) {
  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [settings, setSettings] = useState([])
  const [editSettings, setEditSettings] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')
  const [editUser, setEditUser] = useState(null)
  const [resetPw, setResetPw] = useState({})

  useEffect(() => { loadStats() }, [])
  useEffect(() => { if (tab === 'users') loadUsers() }, [tab])
  useEffect(() => { if (tab === 'settings') loadSettings() }, [tab])

  async function loadStats() {
    try {
      const r = await fetch(`${API_URL}/admin/stats`, { headers: hdr() })
      if (!r.ok) throw new Error('Sem permissão')
      setStats(await r.json())
    } catch (e) { setMsg('Erro: ' + e.message) }
  }

  async function loadUsers() {
    try {
      const r = await fetch(`${API_URL}/admin/users`, { headers: hdr() })
      setUsers(await r.json())
    } catch (e) { setMsg('Erro: ' + e.message) }
  }

  async function loadSettings() {
    try {
      const r = await fetch(`${API_URL}/admin/settings`, { headers: hdr() })
      const data = await r.json()
      setSettings(data)
      const map = {}
      data.forEach(s => map[s.chave] = s.valor)
      setEditSettings(map)
    } catch (e) { setMsg('Erro: ' + e.message) }
  }

  async function saveSettings() {
    setSaving(true)
    try {
      const arr = Object.entries(editSettings).map(([chave, valor]) => ({ chave, valor }))
      const r = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT', headers: hdr(), body: JSON.stringify({ settings: arr })
      })
      const data = await r.json()
      if (data.ok) { setMsg('Configurações salvas!'); setSettings(data.settings) }
      else setMsg('Erro: ' + (data.error || 'desconhecido'))
    } catch (e) { setMsg('Erro: ' + e.message) }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function updateUser(id, campos) {
    try {
      const r = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'PUT', headers: hdr(), body: JSON.stringify(campos)
      })
      const data = await r.json()
      if (data.id) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u))
        setMsg('Usuário atualizado')
        setEditUser(null)
      } else setMsg('Erro: ' + (data.error || 'desconhecido'))
    } catch (e) { setMsg('Erro: ' + e.message) }
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteUser(id, email) {
    if (!confirm(`Deletar ${email} permanentemente?`)) return
    try {
      await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE', headers: hdr() })
      setUsers(prev => prev.filter(u => u.id !== id))
      setMsg('Usuário deletado')
    } catch (e) { setMsg('Erro: ' + e.message) }
    setTimeout(() => setMsg(''), 3000)
  }

  async function resetPassword(id) {
    const pw = resetPw[id]
    if (!pw || pw.length < 6) { setMsg('Senha mín. 6 caracteres'); return }
    try {
      await fetch(`${API_URL}/admin/users/${id}/reset-password`, {
        method: 'POST', headers: hdr(), body: JSON.stringify({ novaSenha: pw })
      })
      setMsg('Senha resetada')
      setResetPw(p => ({ ...p, [id]: '' }))
    } catch (e) { setMsg('Erro: ' + e.message) }
    setTimeout(() => setMsg(''), 3000)
  }

  const sty = {
    bg: { minHeight: '100vh', background: '#0a0a1a', color: '#e2e8f0', fontFamily: "'Inter',sans-serif", padding: '20px' },
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '24px', marginBottom: '16px' },
    input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#e2e8f0', fontSize: '14px', width: '100%' },
    btn: { padding: '8px 18px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' },
    tag: (c) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600, background: c, color: '#fff' }),
  }

  const filteredUsers = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.nome?.toLowerCase().includes(search.toLowerCase())
  )

  const settingsGroups = [
    { label: '💰 Preços', keys: ['preco_mensal', 'preco_anual', 'preco_vitalicio'] },
    { label: '📊 Limites de vídeos/mês', keys: ['limite_trial', 'limite_mensal', 'limite_anual', 'limite_vitalicio'] },
    { label: '📥 Download / App', keys: ['versao_app', 'download_url'] },
    { label: '⚠️ Avisos', keys: ['aviso_tokens'] },
  ]

  return (
    <div style={sty.bg}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} style={{ ...sty.btn, background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>← Voltar</button>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🛡️ Painel Admin
          </h1>
        </div>
        {msg && <div style={{ padding: '8px 16px', borderRadius: '8px', background: msg.startsWith('Erro') ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)', color: msg.startsWith('Erro') ? '#fca5a5' : '#86efac', fontSize: '13px', fontWeight: 600 }}>{msg}</div>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[
          { id: 'stats', label: '📊 Dashboard' },
          { id: 'users', label: '👥 Usuários' },
          { id: 'settings', label: '⚙️ Configurações' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            ...sty.btn,
            background: tab === t.id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)',
            color: tab === t.id ? '#fff' : '#94a3b8',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ═══ DASHBOARD ═══ */}
      {tab === 'stats' && stats && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={sty.card}>
              <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>Total Usuários</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#6366f1' }}>{stats.totalUsuarios}</div>
            </div>
            <div style={sty.card}>
              <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>Ativos</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#22c55e' }}>{stats.usuariosAtivos}</div>
            </div>
            {stats.porPlano?.map(p => (
              <div key={p.plano} style={sty.card}>
                <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>{p.plano}</div>
                <div style={{ fontSize: '36px', fontWeight: 800, color: '#a5b4fc' }}>{p.total}</div>
              </div>
            ))}
          </div>

          <div style={sty.card}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700 }}>📋 Últimos cadastros</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '8px', color: '#64748b' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: '#64748b' }}>Plano</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: '#64748b' }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentes?.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px' }}>{u.email}</td>
                    <td style={{ padding: '8px' }}><span style={sty.tag(u.plano === 'vitalicio' ? '#8b5cf6' : u.plano === 'anual' ? '#6366f1' : u.plano === 'mensal' ? '#3b82f6' : '#64748b')}>{u.plano}</span></td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ USUÁRIOS ═══ */}
      {tab === 'users' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Buscar por email ou nome..."
              style={{ ...sty.input, maxWidth: '400px' }}
            />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {['Email', 'Nome', 'Plano', 'Status', 'Vídeos', 'Admin', 'Último Login', 'Ações'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 8px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 8px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</td>
                    <td style={{ padding: '10px 8px' }}>{u.nome || '—'}</td>
                    <td style={{ padding: '10px 8px' }}>
                      {editUser === u.id ? (
                        <select defaultValue={u.plano} onChange={e => updateUser(u.id, { plano: e.target.value })}
                          style={{ ...sty.input, width: '110px', padding: '4px' }}>
                          {['trial', 'mensal', 'anual', 'vitalicio'].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      ) : (
                        <span style={sty.tag(u.plano === 'vitalicio' ? '#8b5cf6' : u.plano === 'anual' ? '#6366f1' : u.plano === 'mensal' ? '#3b82f6' : '#64748b')}>{u.plano}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ color: u.ativo ? '#22c55e' : '#ef4444', fontSize: '12px', fontWeight: 600 }}>
                        {u.ativo ? '● Ativo' : '● Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', color: '#94a3b8' }}>{u.videos_mes_usados}/{u.videos_mes_limite}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <input type="checkbox" checked={!!u.is_admin}
                        onChange={e => updateUser(u.id, { is_admin: e.target.checked })}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '10px 8px', color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {u.ultimo_login ? new Date(u.ultimo_login).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button onClick={() => setEditUser(editUser === u.id ? null : u.id)}
                          style={{ ...sty.btn, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '4px 10px', fontSize: '11px' }}>
                          {editUser === u.id ? 'Fechar' : '✏️'}
                        </button>
                        <button onClick={() => updateUser(u.id, { ativo: !u.ativo })}
                          style={{ ...sty.btn, background: u.ativo ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: u.ativo ? '#fca5a5' : '#86efac', padding: '4px 10px', fontSize: '11px' }}>
                          {u.ativo ? '🚫' : '✅'}
                        </button>
                        <button onClick={() => deleteUser(u.id, u.email)}
                          style={{ ...sty.btn, background: 'rgba(239,68,68,0.15)', color: '#fca5a5', padding: '4px 10px', fontSize: '11px' }}>
                          🗑️
                        </button>
                      </div>
                      {editUser === u.id && (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input
                            placeholder="Nova senha (mín. 6)"
                            type="text"
                            value={resetPw[u.id] || ''}
                            onChange={e => setResetPw(p => ({ ...p, [u.id]: e.target.value }))}
                            style={{ ...sty.input, width: '140px', padding: '4px 8px', fontSize: '12px' }}
                          />
                          <button onClick={() => resetPassword(u.id)}
                            style={{ ...sty.btn, background: '#f59e0b', color: '#000', padding: '4px 10px', fontSize: '11px' }}>
                            🔑 Reset
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && <p style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>Nenhum usuário encontrado</p>}
          </div>
        </div>
      )}

      {/* ═══ CONFIGURAÇÕES ═══ */}
      {tab === 'settings' && (
        <div>
          {settingsGroups.map(g => (
            <div key={g.label} style={sty.card}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700 }}>{g.label}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {g.keys.map(k => {
                  const s = settings.find(s => s.chave === k)
                  const isTextarea = k === 'aviso_tokens'
                  return (
                    <div key={k}>
                      <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                        {s?.descricao || k}
                      </label>
                      {isTextarea ? (
                        <textarea
                          value={editSettings[k] || ''}
                          onChange={e => setEditSettings(p => ({ ...p, [k]: e.target.value }))}
                          rows={4}
                          style={{ ...sty.input, resize: 'vertical' }}
                        />
                      ) : (
                        <input
                          value={editSettings[k] || ''}
                          onChange={e => setEditSettings(p => ({ ...p, [k]: e.target.value }))}
                          style={sty.input}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <button onClick={saveSettings} disabled={saving} style={{
            ...sty.btn, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
            padding: '12px 32px', fontSize: '15px', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Salvando...' : '💾 Salvar Configurações'}
          </button>
        </div>
      )}
    </div>
  )
}
