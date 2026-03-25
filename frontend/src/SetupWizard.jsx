import { useState, useEffect } from 'react'
import { GUIDES } from './ApiKeyGuideModal'

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : (window.location.port === '3000' ? 'http://localhost:3001/api' : `${window.location.origin}/api`)

const hdr = () => ({ Authorization: `Bearer ${localStorage.getItem('vf_token')}`, 'Content-Type': 'application/json' })

/* ─── Objetivos ─────────────────────────────────────────────────────────── */
const GOALS = [
  {
    id: 'free', icon: '🚀', label: 'Começar (Grátis)',
    desc: 'Crie vídeos com roteiro de IA e imagens do Pexels — sem nenhum custo.',
    apis: ['GEMINI_API_KEY', 'PEXELS_API_KEY'],
    badge: 'GRÁTIS', badgeColor: '#22c55e',
  },
  {
    id: 'voice', icon: '🎙️', label: 'Vozes Ultra-Realistas',
    desc: 'Narração com ElevenLabs — qualidade de locutor profissional.',
    apis: ['ELEVENLABS_API_KEY'],
    badge: '~$1/mês', badgeColor: '#f59e0b',
  },
  {
    id: 'kling', icon: '🎬', label: 'Vídeos com Kling AI',
    desc: 'Gere clipes cinematográficos de alta qualidade com IA da Kuaishou.',
    apis: ['KLING_ACCESS_KEY_ID', 'KLING_ACCESS_KEY_SECRET'],
    badge: '~$30/mês', badgeColor: '#f59e0b',
  },
  {
    id: 'replicate', icon: '🎞️', label: 'Vídeos Wan 2.1',
    desc: 'Gere vídeos realistas com o modelo open-source Wan via Replicate.',
    apis: ['REPLICATE_API_TOKEN'],
    badge: '~$0.05/vídeo', badgeColor: '#f59e0b',
  },
  {
    id: 'veo2', icon: '✨', label: 'Vídeos Veo 2 (Google)',
    desc: 'A melhor qualidade de geração de vídeo disponível — requer Google Cloud.',
    apis: [], special: 'veo2',
    badge: '~$0.50/seg', badgeColor: '#ef4444',
  },
  {
    id: 'youtube', icon: '📺', label: 'Publicar no YouTube',
    desc: 'Conecte seu canal e publique automaticamente ao terminar o vídeo.',
    apis: [], special: 'youtube',
    badge: 'GRÁTIS', badgeColor: '#22c55e',
  },
]

const VEO2_STEPS = [
  { title: 'Acesse o Google Cloud Console', desc: 'Entre com sua conta Google no painel do Google Cloud.', link: 'https://console.cloud.google.com', linkLabel: 'Abrir Google Cloud Console' },
  { title: 'Crie ou selecione um projeto', desc: 'No topo da página, clique no seletor de projetos e escolha um existente ou crie um novo.' },
  { title: 'Ative o faturamento', desc: 'No menu esquerdo, clique em "Faturamento" e vincule um cartão de crédito. O Google oferece $300 de crédito gratuito para novos projetos.', link: 'https://console.cloud.google.com/billing', linkLabel: 'Ir para Faturamento' },
  { title: 'Pronto — sem mais configurações!', desc: 'O VideoForge usa sua chave Gemini existente com o Veo 2 automaticamente. Volte ao app e selecione "Gemini Veo" como tipo de vídeo.' },
]

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function mask(v) {
  if (!v || v.length < 8) return v
  return v.slice(0, 4) + '••••••••' + v.slice(-4)
}

/* ─── Componente ─────────────────────────────────────────────────────────── */
export default function SetupWizard({ open, onClose, onSaved, initialGoal }) {
  const [screen, setScreen] = useState('goals')   // 'goals' | 'api' | 'veo2' | 'youtube' | 'done'
  const [goal, setGoal] = useState(null)
  const [apiIdx, setApiIdx] = useState(0)
  const [vals, setVals] = useState({})
  const [saved, setSaved] = useState([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [existing, setExisting] = useState({})   // keys já configuradas
  const [veo2Step, setVeo2Step] = useState(0)

  useEffect(() => {
    if (open) {
      setScreen(initialGoal ? 'api' : 'goals')
      setGoal(initialGoal ? GOALS.find(g => g.id === initialGoal) || null : null)
      setApiIdx(0); setVals({}); setSaved([]); setErr(''); setVeo2Step(0)
      loadExisting()
    }
  }, [open, initialGoal])

  async function loadExisting() {
    try {
      const r = await fetch(`${API_URL}/user/apikeys`, { headers: hdr() })
      const data = await r.json()
      const map = {}
      for (const g of Object.values(data.grupos || {})) {
        for (const k of g.keys || []) {
          if (k.configurada) map[k.key] = k.preview
        }
      }
      setExisting(map)
    } catch {}
  }

  function selectGoal(g) {
    setGoal(g)
    if (g.special === 'veo2') { setScreen('veo2'); return }
    if (g.special === 'youtube') { setScreen('youtube'); return }
    setApiIdx(0); setScreen('api')
  }

  async function saveCurrentKey() {
    const keyName = goal.apis[apiIdx]
    const value = vals[keyName]?.trim()
    if (!value) { setErr('Cole a chave antes de continuar.'); return }
    setSaving(true); setErr('')
    try {
      const r = await fetch(`${API_URL}/user/apikeys`, {
        method: 'PUT', headers: hdr(),
        body: JSON.stringify({ keys: { [keyName]: value } })
      })
      if (!r.ok) throw new Error('Erro ao salvar')
      setSaved(prev => [...prev, keyName])
      goNextApi()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  function goNextApi() {
    if (apiIdx + 1 < goal.apis.length) {
      setApiIdx(i => i + 1)
    } else {
      setScreen('done')
      onSaved?.()
    }
  }

  function skipCurrentKey() {
    goNextApi()
  }

  if (!open) return null

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px',
  }
  const card = {
    background: '#0d0d1f', border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 20, padding: 32, width: '100%', maxWidth: 560,
    maxHeight: '90vh', overflowY: 'auto', position: 'relative',
  }
  const btn = (primary) => ({
    padding: '11px 22px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14,
    border: primary ? 'none' : '1px solid rgba(255,255,255,0.12)',
    background: primary ? 'linear-gradient(135deg,#a78bfa,#6d28d9)' : 'rgba(255,255,255,0.05)',
    color: '#fff',
  })

  /* ── GOALS screen ── */
  if (screen === 'goals') return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#c4b5fd' }}>🪄 O que você quer fazer?</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>Escolha um objetivo e vamos te guiar passo a passo para configurar tudo.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {GOALS.map(g => (
            <button key={g.id} onClick={() => selectGoal(g)} style={{
              textAlign: 'left', padding: 16, borderRadius: 14, cursor: 'pointer',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              transition: 'all 0.2s', color: '#e2e8f0',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{g.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{g.label}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 1.5 }}>{g.desc}</div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${g.badgeColor}22`, color: g.badgeColor }}>
                {g.badge}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  /* ── API setup screen ── */
  if (screen === 'api' && goal) {
    const keyName = goal.apis[apiIdx]
    const guide = GUIDES[keyName] || GUIDES[keyName === 'KLING_ACCESS_KEY_SECRET' ? 'KLING_ACCESS_KEY_ID' : keyName]
    const isAlreadySet = !!existing[keyName]
    const totalApis = goal.apis.length
    const progress = Math.round(((apiIdx) / totalApis) * 100)

    return (
      <div style={overlay}>
        <div style={card}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <button onClick={() => setScreen('goals')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>← Voltar</button>
            <span style={{ fontSize: 12, color: '#64748b' }}>{goal.icon} {goal.label} — {apiIdx + 1} de {totalApis}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>

          {/* Progress bar */}
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#a78bfa,#6d28d9)', borderRadius: 4, transition: 'width 0.4s' }} />
          </div>

          {guide && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 32 }}>{guide.icon}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#e2e8f0' }}>{guide.title}</div>
                  <div style={{ fontSize: 12, color: guide.free ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
                    {guide.free ? '🟢 100% Grátis' : `🟡 Pago — ${guide.pricing || guide.estimatedTime + ' para configurar'}`}
                  </div>
                </div>
              </div>

              {/* Steps summary */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                {guide.steps.slice(0, 3).map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(139,92,246,0.2)', color: '#a78bfa', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{s.desc}</div>
                      {s.link && (
                        <a href={s.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#a78bfa', display: 'inline-block', marginTop: 4 }}>
                          {s.linkLabel} ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Key name hint for KLING_ACCESS_KEY_SECRET */}
          {keyName === 'KLING_ACCESS_KEY_SECRET' && (
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              Agora cole o <strong style={{ color: '#e2e8f0' }}>Access Key Secret</strong> (chave secreta, diferente do ID anterior).
            </p>
          )}

          {isAlreadySet ? (
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#86efac' }}>✅ Chave já configurada: <code>{mask(existing[keyName])}</code></p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={goNextApi} style={btn(true)}>Manter e continuar →</button>
                <button onClick={() => setExisting(p => ({ ...p, [keyName]: null }))} style={btn(false)}>Trocar</button>
              </div>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder={`Cole sua chave ${keyName} aqui...`}
                value={vals[keyName] || ''}
                onChange={e => setVals(p => ({ ...p, [keyName]: e.target.value }))}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10, marginBottom: 12, boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#e2e8f0', fontSize: 13, fontFamily: 'monospace', outline: 'none',
                }}
              />
              {err && <p style={{ color: '#fca5a5', fontSize: 12, margin: '0 0 12px' }}>{err}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveCurrentKey} disabled={saving || !vals[keyName]?.trim()} style={{ ...btn(true), opacity: saving || !vals[keyName]?.trim() ? 0.5 : 1 }}>
                  {saving ? 'Salvando...' : 'Salvar e continuar →'}
                </button>
                <button onClick={skipCurrentKey} style={btn(false)}>Pular por agora</button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  /* ── VEO2 screen ── */
  if (screen === 'veo2') {
    const s = VEO2_STEPS[veo2Step]
    return (
      <div style={overlay}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <button onClick={() => setScreen('goals')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>← Voltar</button>
            <span style={{ fontSize: 12, color: '#64748b' }}>✨ Veo 2 — passo {veo2Step + 1} de {VEO2_STEPS.length}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>

          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((veo2Step + 1) / VEO2_STEPS.length) * 100}%`, background: 'linear-gradient(90deg,#f59e0b,#ef4444)', borderRadius: 4, transition: 'width 0.4s' }} />
          </div>

          <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: '10px 16px', marginBottom: 24, fontSize: 12, color: '#fcd34d' }}>
            ⚠️ O Veo 2 requer Google Cloud com <strong>cobrança ativa</strong>. O custo é debitado direto na sua conta Google Cloud (~$0.50/seg de vídeo). Não é uma chave no VideoForge.
          </div>

          <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
            <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(251,191,36,0.15)', color: '#fcd34d', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{veo2Step + 1}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#e2e8f0', marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{s.desc}</div>
              {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 10, fontSize: 13, color: '#fbbf24' }}>{s.linkLabel} ↗</a>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {veo2Step < VEO2_STEPS.length - 1
              ? <button onClick={() => setVeo2Step(i => i + 1)} style={btn(true)}>Próximo passo →</button>
              : <button onClick={() => { setScreen('done'); onSaved?.() }} style={btn(true)}>Concluir ✓</button>
            }
            {veo2Step > 0 && <button onClick={() => setVeo2Step(i => i - 1)} style={btn(false)}>← Anterior</button>}
          </div>
        </div>
      </div>
    )
  }

  /* ── YouTube screen ── */
  if (screen === 'youtube') return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button onClick={() => setScreen('goals')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>← Voltar</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📺</div>
          <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 800, color: '#e2e8f0' }}>Conectar YouTube</h3>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            Para publicar vídeos automaticamente, conecte seu canal do YouTube. O processo usa OAuth seguro — o VideoForge nunca acessa sua senha.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => { onClose(); setTimeout(() => window.dispatchEvent(new CustomEvent('vf:openSocial')), 200) }}
              style={{ ...btn(true), fontSize: 15, padding: '13px 32px' }}
            >
              Conectar canal do YouTube →
            </button>
            <p style={{ fontSize: 12, color: '#475569' }}>Você será redirecionado para a aba "Redes Sociais" em Minha Conta.</p>
          </div>
        </div>
      </div>
    </div>
  )

  /* ── DONE screen ── */
  if (screen === 'done') return (
    <div style={overlay}>
      <div style={{ ...card, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800, color: '#c4b5fd' }}>Tudo configurado!</h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
          {saved.length > 0
            ? `${saved.length} chave${saved.length > 1 ? 's' : ''} salva${saved.length > 1 ? 's' : ''} com sucesso.`
            : 'Configuração concluída.'
          } Agora você pode criar vídeos com esse recurso ativado.
        </p>
        {saved.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
            {saved.map(k => (
              <span key={k} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', color: '#86efac', border: '1px solid rgba(34,197,94,0.2)' }}>
                ✅ {k}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onClose} style={btn(true)}>Ir criar meu vídeo →</button>
          <button onClick={() => setScreen('goals')} style={btn(false)}>Configurar mais</button>
        </div>
      </div>
    </div>
  )

  return null
}
