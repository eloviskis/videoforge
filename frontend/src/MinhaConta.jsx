import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : (window.location.port === '3000' ? 'http://localhost:3001/api' : `${window.location.origin}/api`)

const hdr = () => ({ Authorization: `Bearer ${localStorage.getItem('vf_token')}`, 'Content-Type': 'application/json' })

export default function MinhaConta({ onBack, user }) {
  const [tab, setTab] = useState('apikeys')
  const [apiKeys, setApiKeys] = useState([])
  const [apiGrupos, setApiGrupos] = useState({})
  const [apiEdits, setApiEdits] = useState({})
  const [apiSaving, setApiSaving] = useState(false)
  const [showValues, setShowValues] = useState({})
  const [socials, setSocials] = useState([])
  const [socialLoading, setSocialLoading] = useState(null) // platform being connected
  const [msg, setMsg] = useState('')
  const [profile, setProfile] = useState(null)

  useEffect(() => { loadProfile() }, [])
  useEffect(() => { if (tab === 'apikeys') loadApiKeys() }, [tab])
  useEffect(() => { if (tab === 'social') loadSocials() }, [tab])

  async function loadProfile() {
    try {
      const r = await fetch(`${API_URL}/user/profile`, { headers: hdr() })
      if (r.ok) setProfile(await r.json())
    } catch {}
  }

  async function loadApiKeys() {
    try {
      const r = await fetch(`${API_URL}/user/apikeys`, { headers: hdr() })
      const data = await r.json()
      setApiKeys(data.keys || [])
      setApiGrupos(data.grupos || {})
      setApiEdits({})
    } catch (e) { flash('Erro: ' + e.message) }
  }

  async function loadSocials() {
    try {
      const r = await fetch(`${API_URL}/user/social/platforms`, { headers: hdr() })
      if (r.ok) setSocials(await r.json())
    } catch (e) { flash('Erro: ' + e.message) }
  }

  async function saveApiKeys() {
    const changed = Object.entries(apiEdits).filter(([, v]) => v !== undefined && v !== null)
    if (!changed.length) return flash('Nenhuma alteração')
    setApiSaving(true)
    try {
      const keys = {}
      changed.forEach(([k, v]) => keys[k] = v)
      const r = await fetch(`${API_URL}/user/apikeys`, { method: 'PUT', headers: hdr(), body: JSON.stringify({ keys }) })
      const data = await r.json()
      if (data.ok) { flash(`✅ ${data.updated} chave(s) salva(s)!`); setApiEdits({}); loadApiKeys() }
      else flash('Erro: ' + (data.error || ''))
    } catch (e) { flash('Erro: ' + e.message) }
    setApiSaving(false)
  }

  async function removeKey(keyName, label) {
    if (!confirm(`Remover sua chave "${label}"?`)) return
    try {
      await fetch(`${API_URL}/user/apikeys/${keyName}`, { method: 'DELETE', headers: hdr() })
      flash('🗑️ Chave removida')
      loadApiKeys()
    } catch (e) { flash('Erro: ' + e.message) }
  }

  async function connectSocial(platform) {
    setSocialLoading(platform)
    try {
      const r = await fetch(`${API_URL}/user/social/${platform}/auth`, { headers: hdr() })
      const data = await r.json()
      if (!r.ok) { flash(`Erro: ${data.error || 'Falha ao iniciar'}`); setSocialLoading(null); return }
      if (data.authUrl) {
        const popup = window.open(data.authUrl, `connect_${platform}`, 'width=600,height=700,scrollbars=yes')
        const check = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(check)
            setSocialLoading(null)
            loadSocials()
            loadProfile()
          }
        }, 1000)
      } else {
        flash('Erro: URL de autorização não disponível')
        setSocialLoading(null)
      }
    } catch (e) {
      flash(`Erro: ${e.message}`)
      setSocialLoading(null)
    }
  }

  async function disconnectSocial(platform) {
    if (!confirm('Desconectar esta rede social?')) return
    try {
      await fetch(`${API_URL}/user/social/${platform}/disconnect`, { method: 'POST', headers: hdr() })
      flash('✅ Desconectado!')
      loadSocials()
      loadProfile()
    } catch (e) { flash('Erro: ' + e.message) }
  }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const sty = {
    bg: { minHeight: '100vh', background: '#0a0a1a', color: '#e2e8f0', fontFamily: "'Inter',sans-serif", padding: '20px' },
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '24px', marginBottom: '16px' },
    input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#e2e8f0', fontSize: '14px', width: '100%', boxSizing: 'border-box' },
    btn: { padding: '8px 18px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' },
    tag: (c) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600, background: c, color: '#fff' }),
  }

  const planoColors = { trial: '#64748b', mensal: '#3b82f6', anual: '#8b5cf6', vitalicio: '#a855f7' }
  const planoNames = { trial: 'Trial', mensal: 'Mensal', anual: 'Anual', vitalicio: 'Vitalício' }
  const changedCount = Object.keys(apiEdits).length

  return (
    <div style={sty.bg}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} style={{ ...sty.btn, background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>← Voltar</button>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg,#8b5cf6,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ⚙️ Minha Conta
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {profile && (
            <>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>{profile.email}</span>
              <span style={sty.tag(planoColors[profile.plano])}>{planoNames[profile.plano]}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {profile.api_keys_configuradas} keys · {profile.redes_conectadas} redes
              </span>
            </>
          )}
        </div>
        {msg && <div style={{ padding: '8px 16px', borderRadius: '8px', background: msg.startsWith('Erro') ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)', color: msg.startsWith('Erro') ? '#fca5a5' : '#86efac', fontSize: '13px', fontWeight: 600, width: '100%' }}>{msg}</div>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[
          { id: 'apikeys', label: '🔑 Minhas API Keys' },
          { id: 'social', label: '📱 Redes Sociais' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            ...sty.btn,
            background: tab === t.id ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.06)',
            color: tab === t.id ? '#fff' : '#94a3b8',
            padding: '10px 20px', fontSize: '14px',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ═══ API KEYS ═══ */}
      {tab === 'apikeys' && (
        <div>
          {/* Intro card */}
          <div style={{ ...sty.card, borderColor: 'rgba(139,92,246,0.15)', background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(168,85,247,0.04))' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700 }}>🔑 Configure suas chaves de API</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
              Adicione suas próprias chaves para usar os serviços de IA. As chaves marcadas como <span style={{ color: '#22c55e', fontWeight: 600 }}>GRÁTIS</span> são de serviços sem custo.
              Suas chaves ficam seguras e são usadas apenas nos seus vídeos.
            </p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: '12px', color: '#86efac' }}>Sua chave pessoal</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }} />
                <span style={{ fontSize: '12px', color: '#93c5fd' }}>Chave global disponível</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#475569' }} />
                <span style={{ fontSize: '12px', color: '#64748b' }}>Não configurada</span>
              </div>
            </div>
          </div>

          {/* Grupos */}
          {Object.entries(apiGrupos).map(([grupoId, grupo]) => {
            if (!grupo.keys?.length) return null
            const configCount = grupo.keys.filter(k => k.configurada || k.globalDisponivel).length
            return (
              <div key={grupoId} style={sty.card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{grupo.label}</h3>
                  <span style={sty.tag(configCount === grupo.keys.length ? '#22c55e' : configCount > 0 ? '#f59e0b' : '#64748b')}>
                    {configCount}/{grupo.keys.length}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {grupo.keys.map(key => {
                    const hasEdit = apiEdits[key.key] !== undefined
                    const show = showValues[key.key]
                    const dotColor = key.configurada ? '#22c55e' : key.globalDisponivel ? '#3b82f6' : '#475569'
                    return (
                      <div key={key.key} style={{
                        padding: '14px 16px', borderRadius: '12px',
                        background: hasEdit ? 'rgba(139,92,246,0.06)' : key.configurada ? 'rgba(34,197,94,0.04)' : key.globalDisponivel ? 'rgba(59,130,246,0.04)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${hasEdit ? 'rgba(139,92,246,0.25)' : key.configurada ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)'}`,
                        transition: 'all 0.2s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ fontSize: '22px', marginTop: '2px' }}>{key.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Label row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                              <span style={{ fontWeight: 600, fontSize: '14px' }}>{key.label}</span>
                              {key.required && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>Obrigatório</span>}
                              {key.free !== undefined && (
                                <span style={sty.tag(key.free ? '#22c55e' : '#f59e0b')}>
                                  {key.free ? '🟢 Grátis' : '🟡 Pago'}
                                </span>
                              )}
                              {key.configurada && (
                                <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px' }}>
                                  ✅ {key.preview}
                                </span>
                              )}
                              {key.globalDisponivel && !key.configurada && (
                                <span style={{ fontSize: '10px', color: '#93c5fd', background: 'rgba(59,130,246,0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                                  🌐 Global ativa
                                </span>
                              )}
                            </div>
                            {/* Descrição */}
                            {key.desc && <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>{key.desc}</p>}
                            {/* Input */}
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <input
                                type={show ? 'text' : 'password'}
                                value={hasEdit ? apiEdits[key.key] : ''}
                                onChange={e => setApiEdits(p => ({ ...p, [key.key]: e.target.value }))}
                                placeholder={key.configurada ? 'Manter atual (deixe vazio)' : key.globalDisponivel ? 'Opcional — já disponível globalmente' : 'Cole sua chave aqui...'}
                                style={{ ...sty.input, fontSize: '12px', fontFamily: 'monospace' }}
                              />
                              <button onClick={() => setShowValues(p => ({ ...p, [key.key]: !p[key.key] }))}
                                style={{ ...sty.btn, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', padding: '8px 10px', fontSize: '13px', flexShrink: 0 }}>
                                {show ? '🙈' : '👁️'}
                              </button>
                              {key.configurada && (
                                <button onClick={() => removeKey(key.key, key.label)}
                                  style={{ ...sty.btn, background: 'rgba(239,68,68,0.12)', color: '#fca5a5', padding: '8px 10px', fontSize: '13px', flexShrink: 0 }}>
                                  🗑️
                                </button>
                              )}
                            </div>
                            {/* Hint link */}
                            {key.hint && !key.configurada && !key.globalDisponivel && (
                              <a href={key.hint} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#8b5cf6', textDecoration: 'none', marginTop: '6px' }}>
                                🔗 Criar conta / obter chave →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Botão salvar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
            <button onClick={saveApiKeys} disabled={apiSaving || !changedCount} style={{
              ...sty.btn,
              background: changedCount > 0 ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.06)',
              color: changedCount > 0 ? '#fff' : '#475569',
              padding: '12px 32px', fontSize: '15px', opacity: apiSaving ? 0.6 : 1,
            }}>
              {apiSaving ? '⏳ Salvando...' : changedCount > 0 ? `💾 Salvar ${changedCount} chave(s)` : '💾 Salvar Chaves'}
            </button>
            {changedCount > 0 && (
              <button onClick={() => setApiEdits({})} style={{ ...sty.btn, background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ REDES SOCIAIS ═══ */}
      {tab === 'social' && (
        <div>
          {/* Intro */}
          <div style={{ ...sty.card, borderColor: 'rgba(139,92,246,0.15)', background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(168,85,247,0.04))' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700 }}>📱 Conecte suas redes sociais</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
              Clique em <strong>"Conectar"</strong> e autorize o acesso à sua conta.
              Depois de conectar, seus vídeos poderão ser publicados automaticamente!
            </p>
          </div>

          {/* Cards de redes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {socials.map(social => (
              <div key={social.platform} style={{
                ...sty.card,
                borderColor: social.connected ? `${social.color}33` : social.available ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                background: social.connected ? `${social.color}0a` : 'rgba(255,255,255,0.02)',
                display: 'flex', flexDirection: 'column', gap: '12px',
                transition: 'all 0.3s', marginBottom: 0,
                opacity: social.available || social.connected ? 1 : 0.5,
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '16px',
                    background: social.connected ? social.color : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', flexShrink: 0,
                    boxShadow: social.connected ? `0 4px 20px ${social.color}40` : 'none',
                    transition: 'all 0.3s',
                  }}>
                    {social.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '15px' }}>{social.label}</span>
                      {social.connected && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#22c55e', background: 'rgba(34,197,94,0.12)', padding: '2px 8px', borderRadius: '99px', fontWeight: 600 }}>
                          ● Conectado
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{social.desc}</div>
                  </div>
                </div>

                {/* Profile info quando conectado */}
                {social.connected && social.profile && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {social.profile.image && (
                      <img src={social.profile.image} alt=""
                        style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${social.color}` }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {social.profile.name || social.profile.id || 'Conta conectada'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Conectado {social.connectedAt ? `em ${new Date(social.connectedAt).toLocaleDateString('pt-BR')}` : ''}
                      </div>
                    </div>
                  </div>
                )}

                {/* Botão de ação */}
                <div style={{ marginTop: 'auto' }}>
                  {social.connected ? (
                    <button onClick={() => disconnectSocial(social.platform)} style={{
                      ...sty.btn, width: '100%', padding: '10px',
                      background: 'rgba(239,68,68,0.08)', color: '#fca5a5',
                      border: '1px solid rgba(239,68,68,0.15)',
                      transition: 'all 0.2s',
                    }}>
                      🔌 Desconectar
                    </button>
                  ) : social.available ? (
                    <button
                      onClick={() => connectSocial(social.platform)}
                      disabled={socialLoading === social.platform}
                      style={{
                        ...sty.btn, width: '100%', padding: '12px',
                        background: socialLoading === social.platform
                          ? 'rgba(255,255,255,0.1)'
                          : `linear-gradient(135deg, ${social.color}, ${social.color}cc)`,
                        color: '#fff',
                        boxShadow: `0 4px 15px ${social.color}33`,
                        opacity: socialLoading === social.platform ? 0.7 : 1,
                        cursor: socialLoading === social.platform ? 'wait' : 'pointer',
                        fontSize: '14px', fontWeight: 700,
                        transition: 'all 0.2s',
                      }}
                    >
                      {socialLoading === social.platform ? '⏳ Abrindo...' : `🔗 Conectar ${social.label}`}
                    </button>
                  ) : (
                    <div style={{
                      padding: '10px', borderRadius: '8px',
                      background: 'rgba(100,116,139,0.06)', border: '1px solid rgba(100,116,139,0.1)',
                      textAlign: 'center',
                    }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        🔒 Não configurado pelo administrador
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Info box */}
          <div style={{ ...sty.card, marginTop: '16px', borderColor: 'rgba(139,92,246,0.12)', background: 'rgba(139,92,246,0.04)' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#c4b5fd' }}>💡 Como funciona?</h4>
            <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.8 }}>
              <p style={{ margin: '0 0 6px' }}><strong>1.</strong> Clique em <strong>"Conectar"</strong> na rede desejada</p>
              <p style={{ margin: '0 0 6px' }}><strong>2.</strong> Uma janela abrirá para você autorizar o acesso</p>
              <p style={{ margin: '0 0 6px' }}><strong>3.</strong> Pronto! Ao criar um vídeo, escolha onde publicar automaticamente</p>
              <p style={{ margin: 0, color: '#64748b', fontSize: '12px', marginTop: '8px' }}>
                🔒 Seus tokens ficam seguros e são usados apenas para publicar seus vídeos. Você pode desconectar a qualquer momento.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
