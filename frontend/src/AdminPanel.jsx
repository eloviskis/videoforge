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
  // Hotmart states
  const [hotmartStatus, setHotmartStatus] = useState(null)
  const [hotmartLogs, setHotmartLogs] = useState([])
  const [hotmartLogsTotal, setHotmartLogsTotal] = useState(0)
  const [hotmartLogsPage, setHotmartLogsPage] = useState(0)
  const [hotmartTesting, setHotmartTesting] = useState(false)
  const [hotmartTestResult, setHotmartTestResult] = useState('')
  const [hotmartToken, setHotmartToken] = useState('')
  const [hotmartSaving, setHotmartSaving] = useState(false)
  const [hotmartCopied, setHotmartCopied] = useState(false)

  useEffect(() => { loadStats() }, [])
  useEffect(() => { if (tab === 'users') loadUsers() }, [tab])
  useEffect(() => { if (tab === 'settings') loadSettings() }, [tab])
  useEffect(() => { if (tab === 'hotmart') { loadHotmartStatus(); loadHotmartLogs(0); loadSettings() } }, [tab])

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

  // ── Hotmart functions ──
  async function loadHotmartStatus() {
    try {
      const r = await fetch(`${API_URL}/admin/hotmart/status`, { headers: hdr() })
      const data = await r.json()
      setHotmartStatus(data)
    } catch (e) { setMsg('Erro: ' + e.message) }
  }

  async function loadHotmartLogs(page = 0) {
    try {
      const limit = 20
      const r = await fetch(`${API_URL}/admin/hotmart/logs?limit=${limit}&offset=${page * limit}`, { headers: hdr() })
      const data = await r.json()
      setHotmartLogs(data.logs || [])
      setHotmartLogsTotal(data.total || 0)
      setHotmartLogsPage(page)
    } catch { setHotmartLogs([]); setHotmartLogsTotal(0) }
  }

  async function testHotmartWebhook() {
    setHotmartTesting(true)
    setHotmartTestResult('')
    try {
      const r = await fetch(`${API_URL}/admin/hotmart/test-webhook`, { method: 'POST', headers: hdr() })
      const data = await r.json()
      setHotmartTestResult(data.message || JSON.stringify(data))
      loadHotmartLogs(0)
      loadHotmartStatus()
    } catch (e) { setHotmartTestResult('❌ Erro: ' + e.message) }
    setHotmartTesting(false)
  }

  async function saveHotmartToken() {
    if (!hotmartToken.trim()) { setMsg('Token não pode ser vazio'); return }
    setHotmartSaving(true)
    try {
      const r = await fetch(`${API_URL}/admin/hotmart/token`, {
        method: 'PUT', headers: hdr(), body: JSON.stringify({ token: hotmartToken.trim() })
      })
      const data = await r.json()
      setMsg(data.message || 'Token atualizado')
      setHotmartToken('')
      loadHotmartStatus()
    } catch (e) { setMsg('Erro: ' + e.message) }
    setHotmartSaving(false)
    setTimeout(() => setMsg(''), 5000)
  }

  async function saveHotmartCheckoutUrls() {
    setHotmartSaving(true)
    try {
      const checkoutKeys = ['hotmart_checkout_mensal', 'hotmart_checkout_anual', 'hotmart_checkout_vitalicio', 'hotmart_produto_id', 'hotmart_email_boas_vindas']
      const arr = checkoutKeys.filter(k => editSettings[k] !== undefined).map(k => ({ chave: k, valor: editSettings[k] || '' }))
      const r = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT', headers: hdr(), body: JSON.stringify({ settings: arr })
      })
      const data = await r.json()
      if (data.ok) { setMsg('🔥 URLs do Hotmart salvas!'); loadHotmartStatus() }
      else setMsg('Erro: ' + (data.error || 'desconhecido'))
    } catch (e) { setMsg('Erro: ' + e.message) }
    setHotmartSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    setHotmartCopied(true)
    setTimeout(() => setHotmartCopied(false), 2000)
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
          { id: 'hotmart', label: '🔥 Hotmart' },
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

      {/* ═══ HOTMART ═══ */}
      {tab === 'hotmart' && (
        <div>
          {/* Checklist de Setup */}
          <div style={sty.card}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700 }}>🚀 Setup da Integração Hotmart</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
              Siga os passos abaixo para configurar a integração completa com a Hotmart.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { key: 'hottok', label: 'Configurar Hottok (token de segurança)', desc: 'Copie o Hottok em Hotmart → Ferramentas → Webhooks' },
                { key: 'webhook_url', label: 'Webhook URL configurado', desc: 'Cole a URL do webhook na Hotmart (copiável abaixo)' },
                { key: 'produto_id', label: 'ID do Produto configurado', desc: 'Opcional: para validar eventos de um produto específico' },
                { key: 'checkout_mensal', label: 'URL de checkout mensal', desc: 'Link de pagamento para o plano mensal' },
                { key: 'checkout_anual', label: 'URL de checkout anual', desc: 'Link de pagamento para o plano anual' },
                { key: 'checkout_vitalicio', label: 'URL de checkout vitalício', desc: 'Link de pagamento para o plano vitalício' },
              ].map((step, i) => {
                const done = hotmartStatus?.checklist?.[step.key]
                return (
                  <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '10px', background: done ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#22c55e' : 'rgba(255,255,255,0.08)', color: done ? '#fff' : '#64748b', fontSize: '14px', fontWeight: 800, flexShrink: 0 }}>
                      {done ? '✓' : i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: done ? '#86efac' : '#e2e8f0' }}>{step.label}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{step.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Webhook URL */}
          <div style={sty.card}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>🔗 URL do Webhook</h3>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '12px' }}>
              Copie esta URL e cole em <strong>Hotmart → Ferramentas → Webhooks → Novo Webhook</strong>
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <code style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#a5b4fc', flex: 1, wordBreak: 'break-all', fontFamily: "'JetBrains Mono', monospace" }}>
                {hotmartStatus?.webhook_url || 'Carregando...'}
              </code>
              <button onClick={() => copyToClipboard(hotmartStatus?.webhook_url || '')} style={{ ...sty.btn, background: hotmartCopied ? '#22c55e' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', padding: '10px 16px', whiteSpace: 'nowrap' }}>
                {hotmartCopied ? '✅ Copiado!' : '📋 Copiar'}
              </button>
            </div>
            <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <div style={{ fontSize: '12px', color: '#fbbf24' }}>
                ⚡ <strong>Eventos suportados:</strong> PURCHASE_APPROVED, PURCHASE_COMPLETE, PURCHASE_CANCELED, PURCHASE_REFUNDED, PURCHASE_CHARGEBACK, SUBSCRIPTION_CANCELLATION, PURCHASE_DELAYED
              </div>
            </div>
          </div>

          {/* Hottok */}
          <div style={sty.card}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>🔐 Hottok (Token de Segurança)</h3>
            {hotmartStatus?.hottok_configurado ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={sty.tag('#22c55e')}>✅ Configurado</span>
                <span style={{ color: '#64748b', fontSize: '13px', fontFamily: 'monospace' }}>{hotmartStatus.hottok_preview}</span>
              </div>
            ) : (
              <div style={{ marginBottom: '12px' }}>
                <span style={sty.tag('#ef4444')}>❌ Não configurado</span>
              </div>
            )}
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
              Encontre o Hottok em: <strong>Hotmart → Ferramentas → Webhooks → Configurações</strong>
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="password"
                value={hotmartToken}
                onChange={e => setHotmartToken(e.target.value)}
                placeholder="Cole o Hottok aqui..."
                style={{ ...sty.input, maxWidth: '400px' }}
              />
              <button onClick={saveHotmartToken} disabled={hotmartSaving} style={{ ...sty.btn, background: '#f59e0b', color: '#000', padding: '8px 16px', opacity: hotmartSaving ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                {hotmartSaving ? 'Salvando...' : '💾 Salvar Token'}
              </button>
            </div>
            <p style={{ color: '#64748b', fontSize: '11px', marginTop: '6px' }}>
              ⚠️ O token é salvo em runtime. Para persistir entre restarts, adicione <code style={{ color: '#a5b4fc' }}>HOTMART_TOKEN=seu_token</code> no .env.production
            </p>
          </div>

          {/* URLs de Checkout */}
          <div style={sty.card}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>🛒 URLs de Checkout por Plano</h3>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '12px' }}>
              Configure os links de pagamento da Hotmart para cada plano. Serão exibidos na Landing Page.
            </p>
            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                { key: 'hotmart_checkout_mensal', label: '💳 Checkout Mensal', color: '#3b82f6' },
                { key: 'hotmart_checkout_anual', label: '⭐ Checkout Anual', color: '#6366f1' },
                { key: 'hotmart_checkout_vitalicio', label: '👑 Checkout Vitalício', color: '#8b5cf6' },
              ].map(plan => (
                <div key={plan.key}>
                  <label style={{ fontSize: '12px', color: plan.color, fontWeight: 600, display: 'block', marginBottom: '4px' }}>{plan.label}</label>
                  <input
                    value={editSettings[plan.key] || ''}
                    onChange={e => setEditSettings(p => ({ ...p, [plan.key]: e.target.value }))}
                    placeholder="https://pay.hotmart.com/..."
                    style={sty.input}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>🆔 ID do Produto (opcional)</label>
                <input
                  value={editSettings['hotmart_produto_id'] || ''}
                  onChange={e => setEditSettings(p => ({ ...p, hotmart_produto_id: e.target.value }))}
                  placeholder="Ex: 12345678"
                  style={{ ...sty.input, maxWidth: '300px' }}
                />
              </div>
            </div>
            <button onClick={saveHotmartCheckoutUrls} disabled={hotmartSaving} style={{
              ...sty.btn, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff',
              padding: '10px 24px', fontSize: '14px', marginTop: '16px', opacity: hotmartSaving ? 0.6 : 1,
            }}>
              {hotmartSaving ? 'Salvando...' : '💾 Salvar URLs de Checkout'}
            </button>
          </div>

          {/* Email de Boas-Vindas */}
          <div style={sty.card}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>📧 Template de Email de Boas-Vindas</h3>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
              Modelo de email enviado ao comprador. Use as variáveis: <code style={{ color: '#a5b4fc' }}>{'{URL}'}</code>, <code style={{ color: '#a5b4fc' }}>{'{EMAIL}'}</code>, <code style={{ color: '#a5b4fc' }}>{'{SENHA}'}</code>
            </p>
            <textarea
              value={editSettings['hotmart_email_boas_vindas'] || ''}
              onChange={e => setEditSettings(p => ({ ...p, hotmart_email_boas_vindas: e.target.value }))}
              rows={6}
              style={{ ...sty.input, fontFamily: 'monospace', fontSize: '12px', resize: 'vertical' }}
              placeholder="Olá! Acesse {URL} com login {EMAIL} e senha {SENHA}"
            />
            <button onClick={() => {
              const arr = [{ chave: 'hotmart_email_boas_vindas', valor: editSettings['hotmart_email_boas_vindas'] || '' }]
              fetch(`${API_URL}/admin/settings`, { method: 'PUT', headers: hdr(), body: JSON.stringify({ settings: arr }) })
                .then(r => r.json()).then(d => { if (d.ok) setMsg('📧 Template salvo!'); else setMsg('Erro') })
                .catch(e => setMsg('Erro: ' + e.message))
              setTimeout(() => setMsg(''), 3000)
            }} style={{ ...sty.btn, background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', marginTop: '8px' }}>
              💾 Salvar Template
            </button>
          </div>

          {/* Testar Webhook */}
          <div style={sty.card}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>🧪 Testar Webhook</h3>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '12px' }}>
              Envia um evento de teste (PURCHASE_APPROVED) para verificar se o webhook está funcionando. O usuário de teste é removido automaticamente.
            </p>
            <button onClick={testHotmartWebhook} disabled={hotmartTesting} style={{
              ...sty.btn, background: hotmartTesting ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff',
              padding: '10px 24px', fontSize: '14px', opacity: hotmartTesting ? 0.6 : 1,
            }}>
              {hotmartTesting ? '⏳ Testando...' : '🚀 Enviar Teste'}
            </button>
            {hotmartTestResult && (
              <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', background: hotmartTestResult.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${hotmartTestResult.startsWith('✅') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, fontSize: '13px', color: hotmartTestResult.startsWith('✅') ? '#86efac' : '#fca5a5' }}>
                {hotmartTestResult}
              </div>
            )}
          </div>

          {/* Log de Eventos */}
          <div style={sty.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>📋 Log de Webhooks</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{hotmartLogsTotal} eventos</span>
                <button onClick={() => loadHotmartLogs(0)} style={{ ...sty.btn, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', padding: '4px 12px', fontSize: '12px' }}>
                  🔄 Atualizar
                </button>
              </div>
            </div>

            {hotmartLogs.length > 0 ? (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        {['Evento', 'Email', 'Plano', 'Status', 'IP', 'Data'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 6px', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {hotmartLogs.map(log => {
                        const statusColor = {
                          user_created: '#22c55e', deactivated: '#ef4444', subscription_canceled: '#f59e0b',
                          pending: '#3b82f6', ignored: '#64748b',
                        }[log.status] || '#64748b'
                        return (
                          <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '8px 6px' }}>
                              <span style={sty.tag(log.evento?.includes('APPROVED') || log.evento?.includes('COMPLETE') ? '#22c55e' : log.evento?.includes('CANCEL') || log.evento?.includes('REFUND') || log.evento?.includes('CHARGEBACK') ? '#ef4444' : '#6366f1')}>
                                {log.evento?.replace('PURCHASE_', '').replace('SUBSCRIPTION_', 'SUB_') || '—'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 6px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.email || '—'}</td>
                            <td style={{ padding: '8px 6px' }}>{log.plano || '—'}</td>
                            <td style={{ padding: '8px 6px' }}><span style={{ color: statusColor, fontWeight: 600 }}>{log.status || '—'}</span></td>
                            <td style={{ padding: '8px 6px', color: '#64748b', fontFamily: 'monospace', fontSize: '11px' }}>{log.ip_origem || '—'}</td>
                            <td style={{ padding: '8px 6px', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {hotmartLogsTotal > 20 && (
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                    <button disabled={hotmartLogsPage === 0} onClick={() => loadHotmartLogs(hotmartLogsPage - 1)}
                      style={{ ...sty.btn, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', padding: '6px 14px', fontSize: '12px', opacity: hotmartLogsPage === 0 ? 0.4 : 1 }}>
                      ← Anterior
                    </button>
                    <span style={{ padding: '6px 12px', fontSize: '12px', color: '#64748b' }}>
                      Página {hotmartLogsPage + 1} de {Math.ceil(hotmartLogsTotal / 20)}
                    </span>
                    <button disabled={(hotmartLogsPage + 1) * 20 >= hotmartLogsTotal} onClick={() => loadHotmartLogs(hotmartLogsPage + 1)}
                      style={{ ...sty.btn, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', padding: '6px 14px', fontSize: '12px', opacity: (hotmartLogsPage + 1) * 20 >= hotmartLogsTotal ? 0.4 : 1 }}>
                      Próxima →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#475569' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>Nenhum evento recebido ainda</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Configure o webhook na Hotmart e faça uma compra de teste</div>
              </div>
            )}
          </div>

          {/* Stats últimos 30 dias */}
          {hotmartStatus?.event_stats_30d?.length > 0 && (
            <div style={sty.card}>
              <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>📈 Estatísticas (30 dias)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                {hotmartStatus.event_stats_30d.map((s, i) => (
                  <div key={i} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: s.status === 'user_created' ? '#22c55e' : s.status === 'deactivated' ? '#ef4444' : '#a5b4fc' }}>{s.total}</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', textTransform: 'uppercase' }}>{s.evento?.replace('PURCHASE_', '').replace('SUBSCRIPTION_', '')}</div>
                    <div style={{ fontSize: '10px', color: '#475569' }}>{s.status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
