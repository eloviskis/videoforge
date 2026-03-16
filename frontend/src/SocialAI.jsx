import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : (window.location.port === '3000' ? 'http://localhost:3001/api' : `${window.location.origin}/api`)

// ─── Cores ───
const C = {
  bg: '#0f0f1a', card: '#1a1a2e', border: '#2a2a4a',
  accent: '#E4405F', accentLight: '#f77a8f',
  purple: '#8b5cf6', green: '#22c55e', yellow: '#fbbf24', red: '#ef4444',
  text: '#e2e8f0', muted: '#94a3b8', dim: '#64748b',
}

const cardStyle = {
  background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px',
  padding: '24px', marginBottom: '16px'
}

const btnStyle = (color = C.accent) => ({
  padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
  background: `linear-gradient(135deg, ${color}, ${color}dd)`, color: '#fff',
  fontWeight: 700, fontSize: '14px', transition: 'all 0.2s'
})

const inputStyle = {
  width: '100%', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${C.border}`,
  background: 'rgba(255,255,255,0.04)', color: C.text, fontSize: '14px',
  outline: 'none', boxSizing: 'border-box'
}

const tabBtnStyle = (active) => ({
  padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
  background: active ? C.accent : 'rgba(255,255,255,0.06)', color: active ? '#fff' : C.muted,
  fontWeight: active ? 700 : 500, fontSize: '13px', transition: 'all 0.2s', whiteSpace: 'nowrap'
})

// ═══════════════════════════════════════
// WIZARD DE CONEXÃO INSTAGRAM
// ═══════════════════════════════════════
function ConnectWizard({ onConnect, onClose }) {
  const [step, setStep] = useState(1)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  const iniciarConexao = async () => {
    setConnecting(true)
    setError('')
    try {
      const resp = await axios.get(`${API_URL}/user/social/instagram/auth`)
      const popup = window.open(resp.data.authUrl, 'instagram-auth', 'width=600,height=700,scrollbars=yes')

      // Polling para verificar se conectou
      const check = setInterval(async () => {
        try {
          if (popup?.closed) {
            clearInterval(check)
            const status = await axios.get(`${API_URL}/social-ai/instagram/status`)
            if (status.data.connected) {
              setStep(5)
              setTimeout(() => { onConnect(status.data.profile); onClose() }, 2000)
            } else {
              setConnecting(false)
              setError('Conexão não foi completada. Tente novamente.')
            }
          }
        } catch { clearInterval(check); setConnecting(false) }
      }, 1500)
    } catch (e) {
      setConnecting(false)
      setError(e.response?.data?.error || 'Erro ao iniciar conexão. Verifique se o Facebook App está configurado.')
    }
  }

  const steps = [
    { title: 'Preparação', icon: '📋' },
    { title: 'Conta Profissional', icon: '⚙️' },
    { title: 'Conectar Meta', icon: '🔗' },
    { title: 'Autorização', icon: '🔐' },
    { title: 'Concluído', icon: '✅' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #1a1a2e, #16162a)', border: `1px solid ${C.border}`,
        borderRadius: '24px', padding: '32px', maxWidth: '520px', width: '90%', position: 'relative'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none',
          color: C.dim, fontSize: '20px', cursor: 'pointer'
        }}>✕</button>

        {/* Barra de progresso */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              flex: 1, height: '4px', borderRadius: '2px',
              background: i + 1 <= step ? C.accent : 'rgba(255,255,255,0.1)',
              transition: 'all 0.3s'
            }} />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>{steps[step - 1].icon}</div>
          <h3 style={{ color: C.text, margin: '0 0 4px', fontSize: '20px' }}>
            Passo {step} — {steps[step - 1].title}
          </h3>
        </div>

        {step === 1 && (
          <div>
            <p style={{ color: C.muted, fontSize: '14px', lineHeight: 1.6, textAlign: 'center' }}>
              Para usar o <strong style={{ color: C.accentLight }}>Social AI</strong> com seu Instagram,
              sua conta precisa ser do tipo <strong style={{ color: C.text }}>Business</strong> ou{' '}
              <strong style={{ color: C.text }}>Creator</strong>.
            </p>
            <div style={{
              background: 'rgba(228,64,95,0.08)', border: `1px solid rgba(228,64,95,0.2)`,
              borderRadius: '12px', padding: '16px', marginTop: '16px'
            }}>
              <p style={{ color: C.muted, fontSize: '13px', margin: 0 }}>
                💡 Contas pessoais não permitem publicação via API. A conversão é gratuita e leva 30 segundos.
              </p>
            </div>
            <button onClick={() => setStep(2)} style={{ ...btnStyle(), width: '100%', marginTop: '20px', padding: '14px' }}>
              Verificar minha conta →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p style={{ color: C.muted, fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
              Como transformar em conta profissional:
            </p>
            <div style={{ textAlign: 'left' }}>
              {[
                'Abra o Instagram e vá em ⚙️ Configurações',
                'Toque em Conta',
                'Selecione Mudar para conta profissional',
                'Escolha Creator ou Business',
                'Conecte ao Facebook (opcional mas recomendado)',
              ].map((t, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '8px 0',
                  borderBottom: i < 4 ? `1px solid ${C.border}` : 'none'
                }}>
                  <span style={{
                    background: C.accent, color: '#fff', width: '24px', height: '24px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
                    fontWeight: 700, flexShrink: 0
                  }}>{i + 1}</span>
                  <span style={{ color: C.text, fontSize: '13px' }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setStep(1)} style={{ ...btnStyle('rgba(255,255,255,0.1)'), flex: 1 }}>← Voltar</button>
              <button onClick={() => setStep(3)} style={{ ...btnStyle(), flex: 2, padding: '14px' }}>Já fiz isso ✓</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: C.muted, fontSize: '14px', lineHeight: 1.6 }}>
              Agora você será redirecionado para o <strong style={{ color: C.text }}>login seguro da Meta</strong>.
              <br />Autorize o VideoForge a acessar seu perfil Instagram.
            </p>
            <div style={{
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: '12px', padding: '12px', margin: '16px 0'
            }}>
              <p style={{ color: '#86efac', fontSize: '12px', margin: 0 }}>
                🔒 Seus dados são protegidos. Usamos OAuth oficial da Meta.
                <br />Você pode revogar o acesso a qualquer momento.
              </p>
            </div>
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px', padding: '10px', marginBottom: '12px'
              }}>
                <p style={{ color: C.red, fontSize: '12px', margin: 0 }}>{error}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setStep(2)} style={{ ...btnStyle('rgba(255,255,255,0.1)'), flex: 1 }}>← Voltar</button>
              <button onClick={() => { setStep(4); iniciarConexao() }} disabled={connecting}
                style={{ ...btnStyle(), flex: 2, padding: '14px', opacity: connecting ? 0.6 : 1 }}>
                {connecting ? '⏳ Conectando...' : '📷 Conectar Instagram'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '40px', height: '40px', border: `3px solid ${C.accent}`, borderTopColor: 'transparent',
              borderRadius: '50%', margin: '0 auto 16px',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: C.text, fontSize: '15px', fontWeight: 600 }}>Aguardando autorização...</p>
            <p style={{ color: C.muted, fontSize: '13px' }}>
              Complete o login na janela que abriu.
              <br />Ela fechará automaticamente quando finalizar.
            </p>
            {error && (
              <div style={{ marginTop: '16px' }}>
                <p style={{ color: C.red, fontSize: '13px' }}>{error}</p>
                <button onClick={() => { setStep(3); setError('') }} style={{ ...btnStyle(), marginTop: '8px' }}>
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '8px' }}>🎉</div>
            <p style={{ color: C.green, fontSize: '18px', fontWeight: 700 }}>Instagram conectado com sucesso!</p>
            <p style={{ color: C.muted, fontSize: '14px' }}>
              Agora o VideoForge pode analisar, criar e publicar conteúdos automaticamente.
            </p>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════
export default function SocialAI() {
  // Estado geral
  const [subTab, setSubTab] = useState('connect')
  const [igStatus, setIgStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)

  // Análise
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  // Criar conteúdo
  const [contentPrompt, setContentPrompt] = useState('')
  const [contentTipo, setContentTipo] = useState('post')
  const [contentNicho, setContentNicho] = useState('')
  const [generatedContent, setGeneratedContent] = useState(null)
  const [generating, setGenerating] = useState(false)

  // Posts
  const [posts, setPosts] = useState([])
  const [editingPost, setEditingPost] = useState(null)

  // Calendário
  const [calendar, setCalendar] = useState(null)
  const [calDias, setCalDias] = useState(30)
  const [calNicho, setCalNicho] = useState('')
  const [generatingCal, setGeneratingCal] = useState(false)

  // Media Kit
  const [mediaKit, setMediaKit] = useState(null)
  const [loadingKit, setLoadingKit] = useState(false)

  // Vídeos disponíveis
  const [videos, setVideos] = useState([])

  // Legenda rápida
  const [captionTema, setCaptionTema] = useState('')
  const [captionTom, setCaptionTom] = useState('engajante')
  const [generatedCaption, setGeneratedCaption] = useState(null)
  const [generatingCaption, setGeneratingCaption] = useState(false)

  // Publishing
  const [publishing, setPublishing] = useState({})

  // ── Carregar status inicial ──
  useEffect(() => {
    checkStatus()
    loadPosts()
    loadAnalysis()
    loadCalendar()
    loadVideos()
  }, [])

  const checkStatus = async () => {
    try {
      const r = await axios.get(`${API_URL}/social-ai/instagram/status`)
      setIgStatus(r.data)
      if (r.data.connected) setSubTab('analysis')
    } catch { setIgStatus({ connected: false }) }
    setLoading(false)
  }

  const loadPosts = async () => {
    try { const r = await axios.get(`${API_URL}/social-ai/posts`); setPosts(r.data) } catch {}
  }

  const loadAnalysis = async () => {
    try { const r = await axios.get(`${API_URL}/social-ai/analysis`); if (r.data) setAnalysis(r.data) } catch {}
  }

  const loadCalendar = async () => {
    try { const r = await axios.get(`${API_URL}/social-ai/calendar`); if (r.data) setCalendar(r.data) } catch {}
  }

  const loadVideos = async () => {
    try {
      const r = await axios.get(`${API_URL}/videos`)
      setVideos((r.data || []).filter(v => v.video_url && ['pronto', 'concluido', 'publicado'].includes(v.status)))
    } catch {}
  }

  // ── Ações ──
  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      const r = await axios.post(`${API_URL}/social-ai/analyze`)
      setAnalysis(r.data)
    } catch (e) { alert('Erro: ' + (e.response?.data?.error || e.message)) }
    setAnalyzing(false)
  }

  const generateContent = async () => {
    if (!contentPrompt.trim()) return
    setGenerating(true)
    try {
      const r = await axios.post(`${API_URL}/social-ai/generate-content`, {
        prompt: contentPrompt, tipo: contentTipo, nicho: contentNicho
      })
      setGeneratedContent(r.data)
    } catch (e) { alert('Erro: ' + (e.response?.data?.error || e.message)) }
    setGenerating(false)
  }

  const generateCaption = async () => {
    if (!captionTema.trim()) return
    setGeneratingCaption(true)
    try {
      const r = await axios.post(`${API_URL}/social-ai/generate-caption`, { tema: captionTema, tom: captionTom })
      setGeneratedCaption(r.data)
    } catch (e) { alert('Erro: ' + (e.response?.data?.error || e.message)) }
    setGeneratingCaption(false)
  }

  const savePost = async (data) => {
    try {
      const r = await axios.post(`${API_URL}/social-ai/posts`, data)
      setPosts(prev => [r.data, ...prev])
      return r.data
    } catch (e) { alert('Erro: ' + (e.response?.data?.error || e.message)) }
  }

  const publishPost = async (postId) => {
    setPublishing(p => ({ ...p, [postId]: true }))
    try {
      await axios.post(`${API_URL}/social-ai/posts/${postId}/publish`)
      loadPosts()
    } catch (e) { alert('Erro ao publicar: ' + (e.response?.data?.error || e.message)) }
    setPublishing(p => ({ ...p, [postId]: false }))
  }

  const deletePost = async (postId) => {
    if (!confirm('Excluir este post?')) return
    try { await axios.delete(`${API_URL}/social-ai/posts/${postId}`); loadPosts() } catch {}
  }

  const generateCalendar = async () => {
    setGeneratingCal(true)
    try {
      const r = await axios.post(`${API_URL}/social-ai/calendar/generate`, { dias: calDias, nicho: calNicho })
      setCalendar(r.data)
    } catch (e) { alert('Erro: ' + (e.response?.data?.error || e.message)) }
    setGeneratingCal(false)
  }

  const loadMediaKit = async () => {
    setLoadingKit(true)
    try { const r = await axios.get(`${API_URL}/social-ai/media-kit`); setMediaKit(r.data) } catch {}
    setLoadingKit(false)
  }

  const createFromVideo = async (videoId) => {
    try {
      const r = await axios.post(`${API_URL}/social-ai/from-video/${videoId}`)
      setPosts(prev => [r.data, ...prev])
      setSubTab('posts')
    } catch (e) { alert('Erro: ' + (e.response?.data?.error || e.message)) }
  }

  const saveContentAsPost = async () => {
    if (!generatedContent) return
    const post = await savePost({
      tipo: contentTipo,
      legenda: generatedContent.legenda,
      hashtags: generatedContent.hashtags,
      aiPrompt: contentPrompt
    })
    if (post) { setSubTab('posts'); setGeneratedContent(null); setContentPrompt('') }
  }

  if (loading) return <div style={{ ...cardStyle, textAlign: 'center', padding: '60px' }}>
    <div style={{ fontSize: '40px', marginBottom: '8px' }}>📱</div>
    <p style={{ color: C.muted }}>Carregando Social AI...</p>
  </div>

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  return (
    <div>
      {showWizard && (
        <ConnectWizard
          onConnect={(profile) => { setIgStatus({ connected: true, profile }); setSubTab('analysis') }}
          onClose={() => { setShowWizard(false); checkStatus() }}
        />
      )}

      {/* Header */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>📱</span>
          <div>
            <h2 style={{ margin: 0, color: C.text, fontSize: '20px' }}>Social AI</h2>
            <p style={{ margin: 0, color: C.muted, fontSize: '13px' }}>Automação inteligente para Instagram</p>
          </div>
        </div>

        {igStatus?.connected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {igStatus.profile?.profilePicture && (
              <img src={igStatus.profile.profilePicture} alt="" style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${C.accent}` }} />
            )}
            <div>
              <p style={{ margin: 0, color: C.text, fontSize: '14px', fontWeight: 600 }}>
                {igStatus.profile?.name || igStatus.profile?.username}
              </p>
              <p style={{ margin: 0, color: C.green, fontSize: '11px' }}>● Conectado</p>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowWizard(true)} style={btnStyle()}>
            📷 Conectar Instagram
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'connect', label: '🔗 Conectar' },
          { id: 'analysis', label: '📊 Análise' },
          { id: 'create', label: '✨ Criar Conteúdo' },
          { id: 'caption', label: '📝 Legendas' },
          { id: 'calendar', label: '📅 Calendário' },
          { id: 'posts', label: '📋 Posts' },
          { id: 'video-to-reels', label: '🎬 Vídeo → Reels' },
          { id: 'media-kit', label: '🎯 Media Kit' },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={tabBtnStyle(subTab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── CONECTAR ─── */}
      {subTab === 'connect' && (
        <div style={cardStyle}>
          <h3 style={{ color: C.text, margin: '0 0 16px' }}>🔗 Conexão Instagram</h3>

          {igStatus?.connected ? (
            <div>
              <div style={{
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px'
              }}>
                {igStatus.profile?.profilePicture && (
                  <img src={igStatus.profile.profilePicture} alt="" style={{ width: 64, height: 64, borderRadius: '50%' }} />
                )}
                <div>
                  <h4 style={{ margin: '0 0 4px', color: C.text }}>{igStatus.profile?.name || igStatus.profile?.username}</h4>
                  <p style={{ margin: 0, color: C.muted, fontSize: '13px' }}>
                    👥 {igStatus.profile?.followers?.toLocaleString() || '—'} seguidores · 📸 {igStatus.profile?.mediaCount || '—'} posts
                  </p>
                  <p style={{ margin: '4px 0 0', color: C.green, fontSize: '12px' }}>✅ Conectado e funcionando</p>
                </div>
              </div>

              {igStatus.expired && (
                <div style={{
                  background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: '8px', padding: '12px', marginTop: '12px'
                }}>
                  <p style={{ color: C.yellow, fontSize: '13px', margin: 0 }}>
                    ⚠️ Sua conexão expirou. <button onClick={() => setShowWizard(true)} style={{
                      background: 'none', border: 'none', color: C.accent, cursor: 'pointer', textDecoration: 'underline', fontWeight: 600
                    }}>Reconectar em 1 minuto</button>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📷</div>
              <h3 style={{ color: C.text, margin: '0 0 8px' }}>Conecte seu Instagram</h3>
              <p style={{ color: C.muted, fontSize: '14px', maxWidth: '400px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                Conecte sua conta para que a IA possa analisar seu perfil,
                criar conteúdos e publicar automaticamente.
              </p>
              <button onClick={() => setShowWizard(true)} style={{ ...btnStyle(), padding: '14px 32px', fontSize: '16px' }}>
                📷 Começar Conexão
              </button>
              <p style={{ color: C.dim, fontSize: '11px', marginTop: '12px' }}>
                Requer conta Business ou Creator no Instagram
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── ANÁLISE ─── */}
      {subTab === 'analysis' && (
        <div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: C.text, margin: 0 }}>📊 Análise do Perfil</h3>
              <button onClick={runAnalysis} disabled={analyzing || !igStatus?.connected}
                style={{ ...btnStyle(C.purple), opacity: analyzing ? 0.6 : 1 }}>
                {analyzing ? '⏳ Analisando...' : '🔄 Analisar Agora'}
              </button>
            </div>

            {!igStatus?.connected && (
              <p style={{ color: C.yellow, fontSize: '13px' }}>⚠️ Conecte seu Instagram primeiro para analisar.</p>
            )}

            {analyzing && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{
                  width: '40px', height: '40px', border: `3px solid ${C.purple}`, borderTopColor: 'transparent',
                  borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite'
                }} />
                <p style={{ color: C.muted }}>Analisando seus últimos 30 posts...</p>
              </div>
            )}
          </div>

          {analysis && !analyzing && (
            <>
              {/* Top Posts */}
              <div style={cardStyle}>
                <h4 style={{ color: C.text, margin: '0 0 12px' }}>🏆 Top 10 Posts por Engajamento</h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {(analysis.top_posts || []).slice(0, 10).map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: '12px', padding: '10px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.03)', alignItems: 'center'
                    }}>
                      <span style={{
                        background: i < 3 ? C.accent : 'rgba(255,255,255,0.1)',
                        color: '#fff', width: '28px', height: '28px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 700, flexShrink: 0
                      }}>{i + 1}</span>
                      {p.mediaUrl && (
                        <img src={p.thumbnailUrl || p.mediaUrl} alt="" style={{
                          width: 48, height: 48, borderRadius: '8px', objectFit: 'cover', flexShrink: 0
                        }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, color: C.text, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.caption?.slice(0, 80) || '(sem legenda)'}
                        </p>
                        <p style={{ margin: '2px 0 0', color: C.dim, fontSize: '11px' }}>
                          {p.mediaType} · {new Date(p.timestamp).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: 0, color: C.accentLight, fontSize: '14px', fontWeight: 700 }}>
                          ❤️ {p.likes} · 💬 {p.comments}
                        </p>
                        {p.reach > 0 && <p style={{ margin: 0, color: C.dim, fontSize: '11px' }}>👁️ {p.reach}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid de métricas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                {/* Melhores hashtags */}
                <div style={cardStyle}>
                  <h4 style={{ color: C.text, margin: '0 0 12px' }}># Melhores Hashtags</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(analysis.best_hashtags || []).slice(0, 15).map((h, i) => (
                      <span key={i} style={{
                        background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                        borderRadius: '16px', padding: '4px 10px', fontSize: '12px', color: C.accentLight
                      }}>
                        {h.tag} ({h.count})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Melhores horários */}
                <div style={cardStyle}>
                  <h4 style={{ color: C.text, margin: '0 0 12px' }}>⏰ Melhores Horários</h4>
                  {(analysis.best_times || []).map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: C.text, fontSize: '14px' }}>{t.hour}:00</span>
                      <span style={{ color: C.green, fontSize: '13px' }}>~{t.avgEngagement} engajamento</span>
                    </div>
                  ))}
                </div>

                {/* Melhores formatos */}
                <div style={cardStyle}>
                  <h4 style={{ color: C.text, margin: '0 0 12px' }}>📐 Formatos</h4>
                  {Object.entries(analysis.best_formats || {}).map(([type, data]) => (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: C.text, fontSize: '14px' }}>
                        {type === 'IMAGE' ? '📷 Imagem' : type === 'VIDEO' ? '🎬 Vídeo' : type === 'CAROUSEL_ALBUM' ? '📑 Carrossel' : type}
                      </span>
                      <span style={{ color: C.muted, fontSize: '13px' }}>{data.count} posts · ~{data.avgEngagement} eng.</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sugestões IA */}
              <div style={cardStyle}>
                <h4 style={{ color: C.text, margin: '0 0 12px' }}>💡 Sugestões da IA</h4>
                {(analysis.suggestions || []).map((s, i) => (
                  <div key={i} style={{
                    background: 'rgba(228,64,95,0.06)', border: '1px solid rgba(228,64,95,0.15)',
                    borderRadius: '10px', padding: '12px', marginBottom: '8px'
                  }}>
                    <h5 style={{ margin: '0 0 4px', color: C.accentLight, fontSize: '14px' }}>{s.titulo}</h5>
                    <p style={{ margin: 0, color: C.muted, fontSize: '13px' }}>{s.descricao}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── CRIAR CONTEÚDO ─── */}
      {subTab === 'create' && (
        <div style={cardStyle}>
          <h3 style={{ color: C.text, margin: '0 0 16px' }}>✨ Gerar Conteúdo com IA</h3>

          <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ color: C.muted, fontSize: '12px', display: 'block', marginBottom: '4px' }}>Tipo de conteúdo</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['post', 'carrossel', 'reels', 'stories'].map(t => (
                  <button key={t} onClick={() => setContentTipo(t)}
                    style={tabBtnStyle(contentTipo === t)}>
                    {t === 'post' ? '📷' : t === 'carrossel' ? '📑' : t === 'reels' ? '🎬' : '📱'} {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ color: C.muted, fontSize: '12px', display: 'block', marginBottom: '4px' }}>Nicho (opcional)</label>
              <input value={contentNicho} onChange={e => setContentNicho(e.target.value)}
                placeholder="Ex: marketing digital, fitness, receitas..."
                style={inputStyle} />
            </div>

            <div>
              <label style={{ color: C.muted, fontSize: '12px', display: 'block', marginBottom: '4px' }}>O que você quer criar?</label>
              <textarea value={contentPrompt} onChange={e => setContentPrompt(e.target.value)}
                placeholder="Ex: Crie um carrossel sobre produtividade para empreendedores"
                rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <button onClick={generateContent} disabled={generating || !contentPrompt.trim()}
              style={{ ...btnStyle(C.purple), opacity: generating ? 0.6 : 1 }}>
              {generating ? '⏳ Gerando...' : '🤖 Gerar Conteúdo'}
            </button>
          </div>

          {generatedContent && (
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '16px' }}>
              <h4 style={{ color: C.text, margin: '0 0 12px' }}>📝 Conteúdo Gerado</h4>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: C.muted, fontSize: '12px' }}>Legenda:</label>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px', marginTop: '4px' }}>
                  <p style={{ color: C.text, fontSize: '14px', whiteSpace: 'pre-wrap', margin: 0 }}>{generatedContent.legenda}</p>
                </div>
              </div>

              {generatedContent.slides?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ color: C.muted, fontSize: '12px' }}>Slides do Carrossel:</label>
                  <div style={{ display: 'grid', gap: '8px', marginTop: '4px' }}>
                    {generatedContent.slides.map((slide, i) => (
                      <div key={i} style={{
                        background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)',
                        borderRadius: '8px', padding: '10px', display: 'flex', gap: '8px', alignItems: 'center'
                      }}>
                        <span style={{
                          background: C.purple, color: '#fff', width: '24px', height: '24px', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0
                        }}>{i + 1}</span>
                        <span style={{ color: C.text, fontSize: '13px' }}>{slide}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: C.muted, fontSize: '12px' }}>Hashtags:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {(generatedContent.hashtags || []).map((h, i) => (
                    <span key={i} style={{
                      background: 'rgba(228,64,95,0.1)', borderRadius: '12px', padding: '2px 8px',
                      fontSize: '11px', color: C.accentLight
                    }}>#{h.replace(/^#/, '')}</span>
                  ))}
                </div>
              </div>

              {generatedContent.ideiaVisual && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ color: C.muted, fontSize: '12px' }}>💡 Ideia visual:</label>
                  <p style={{ color: C.text, fontSize: '13px', margin: '4px 0 0' }}>{generatedContent.ideiaVisual}</p>
                </div>
              )}

              {generatedContent.melhorHorario && (
                <p style={{ color: C.muted, fontSize: '12px' }}>⏰ Melhor horário: <strong style={{ color: C.green }}>{generatedContent.melhorHorario}</strong></p>
              )}

              {generatedContent.dica && (
                <div style={{
                  background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                  borderRadius: '8px', padding: '10px', marginTop: '8px'
                }}>
                  <p style={{ color: '#86efac', fontSize: '12px', margin: 0 }}>💡 {generatedContent.dica}</p>
                </div>
              )}

              <button onClick={saveContentAsPost} style={{ ...btnStyle(C.green), marginTop: '16px' }}>
                💾 Salvar como Post
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── LEGENDAS RÁPIDAS ─── */}
      {subTab === 'caption' && (
        <div style={cardStyle}>
          <h3 style={{ color: C.text, margin: '0 0 16px' }}>📝 Gerador de Legendas + Hashtags</h3>

          <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
            <input value={captionTema} onChange={e => setCaptionTema(e.target.value)}
              placeholder="Tema da legenda (ex: dicas de marketing, receita fitness...)"
              style={inputStyle} />

            <div>
              <label style={{ color: C.muted, fontSize: '12px', marginBottom: '4px', display: 'block' }}>Tom:</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['engajante', 'inspirador', 'educativo', 'divertido', 'profissional', 'provocativo'].map(t => (
                  <button key={t} onClick={() => setCaptionTom(t)} style={tabBtnStyle(captionTom === t)}>{t}</button>
                ))}
              </div>
            </div>

            <button onClick={generateCaption} disabled={generatingCaption || !captionTema.trim()}
              style={{ ...btnStyle(C.accent), opacity: generatingCaption ? 0.6 : 1 }}>
              {generatingCaption ? '⏳ Gerando...' : '✨ Gerar Legenda'}
            </button>
          </div>

          {generatedCaption && (
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                <p style={{ color: C.text, fontSize: '14px', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>
                  {generatedCaption.legenda}
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {(generatedCaption.hashtags || []).map((h, i) => (
                  <span key={i} style={{
                    background: 'rgba(228,64,95,0.1)', borderRadius: '12px', padding: '3px 8px',
                    fontSize: '11px', color: C.accentLight
                  }}>#{h.replace(/^#/, '')}</span>
                ))}
              </div>
              <button onClick={() => {
                const text = `${generatedCaption.legenda}\n\n${(generatedCaption.hashtags || []).map(h => `#${h.replace(/^#/, '')}`).join(' ')}`;
                navigator.clipboard.writeText(text);
              }} style={{ ...btnStyle('rgba(255,255,255,0.1)'), marginTop: '12px' }}>
                📋 Copiar Tudo
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── CALENDÁRIO ─── */}
      {subTab === 'calendar' && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ color: C.text, margin: '0 0 16px' }}>📅 Calendário Editorial</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ color: C.muted, fontSize: '12px', display: 'block', marginBottom: '4px' }}>Dias</label>
                <select value={calDias} onChange={e => setCalDias(Number(e.target.value))}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value={7}>7 dias</option>
                  <option value={15}>15 dias</option>
                  <option value={30}>30 dias</option>
                </select>
              </div>
              <div>
                <label style={{ color: C.muted, fontSize: '12px', display: 'block', marginBottom: '4px' }}>Nicho</label>
                <input value={calNicho} onChange={e => setCalNicho(e.target.value)}
                  placeholder="Ex: fitness, educação..." style={inputStyle} />
              </div>
            </div>
            <button onClick={generateCalendar} disabled={generatingCal}
              style={{ ...btnStyle(C.purple), opacity: generatingCal ? 0.6 : 1 }}>
              {generatingCal ? '⏳ Gerando calendário...' : '🤖 Gerar Calendário com IA'}
            </button>
          </div>

          {calendar?.plan && (
            <div style={cardStyle}>
              <h4 style={{ color: C.text, margin: '0 0 12px' }}>📋 Plano de Conteúdo</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                      <th style={{ padding: '8px', textAlign: 'left', color: C.muted }}>Data</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: C.muted }}>Tipo</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: C.muted }}>Tema</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: C.muted }}>Horário</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: C.muted }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calendar.plan.map((item, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '8px', color: C.text }}>{item.data || `Dia ${item.dia}`}</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{
                            background: item.tipo === 'reels' ? 'rgba(139,92,246,0.2)' : item.tipo === 'carrossel' ? 'rgba(228,64,95,0.2)' : 'rgba(34,197,94,0.2)',
                            color: item.tipo === 'reels' ? '#a78bfa' : item.tipo === 'carrossel' ? C.accentLight : '#86efac',
                            padding: '2px 8px', borderRadius: '8px', fontSize: '11px'
                          }}>{item.tipo}</span>
                        </td>
                        <td style={{ padding: '8px', color: C.text }}>{item.tema}</td>
                        <td style={{ padding: '8px', color: C.muted }}>{item.horario}</td>
                        <td style={{ padding: '8px' }}>
                          <button onClick={() => {
                            setContentPrompt(item.descricao || item.tema);
                            setContentTipo(item.tipo || 'post');
                            setSubTab('create');
                          }} style={{ ...btnStyle('rgba(255,255,255,0.1)'), padding: '4px 10px', fontSize: '11px' }}>
                            ✨ Criar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── POSTS ─── */}
      {subTab === 'posts' && (
        <div style={cardStyle}>
          <h3 style={{ color: C.text, margin: '0 0 16px' }}>📋 Meus Posts ({posts.length})</h3>

          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: C.muted }}>Nenhum post criado ainda.</p>
              <button onClick={() => setSubTab('create')} style={btnStyle(C.purple)}>✨ Criar Conteúdo</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {posts.map(post => (
                <div key={post.id} style={{
                  background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
                  borderRadius: '12px', padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{
                        background: post.tipo === 'reels' ? 'rgba(139,92,246,0.2)' : post.tipo === 'carrossel' ? 'rgba(228,64,95,0.2)' : 'rgba(34,197,94,0.2)',
                        color: post.tipo === 'reels' ? '#a78bfa' : post.tipo === 'carrossel' ? C.accentLight : '#86efac',
                        padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600
                      }}>{post.tipo}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '8px', fontSize: '11px',
                        background: post.status === 'publicado' ? 'rgba(34,197,94,0.2)' : post.status === 'agendado' ? 'rgba(251,191,36,0.2)' : post.status === 'erro' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
                        color: post.status === 'publicado' ? C.green : post.status === 'agendado' ? C.yellow : post.status === 'erro' ? C.red : C.muted
                      }}>{post.status}</span>
                    </div>
                    <span style={{ color: C.dim, fontSize: '11px' }}>
                      {new Date(post.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <p style={{ color: C.text, fontSize: '13px', margin: '0 0 8px', whiteSpace: 'pre-wrap', maxHeight: '80px', overflow: 'hidden' }}>
                    {post.legenda?.slice(0, 200) || '(sem legenda)'}
                  </p>

                  {post.hashtags?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '8px' }}>
                      {post.hashtags.slice(0, 10).map((h, i) => (
                        <span key={i} style={{ fontSize: '10px', color: C.accentLight }}>#{h.replace(/^#/, '')}</span>
                      ))}
                      {post.hashtags.length > 10 && <span style={{ fontSize: '10px', color: C.dim }}>+{post.hashtags.length - 10}</span>}
                    </div>
                  )}

                  {post.scheduled_at && (
                    <p style={{ color: C.yellow, fontSize: '11px', margin: '0 0 8px' }}>
                      📅 Agendado: {new Date(post.scheduled_at).toLocaleString('pt-BR')}
                    </p>
                  )}

                  {post.error_message && (
                    <p style={{ color: C.red, fontSize: '11px', margin: '0 0 8px' }}>❌ {post.error_message}</p>
                  )}

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {post.status === 'rascunho' && igStatus?.connected && (
                      <button onClick={() => publishPost(post.id)} disabled={publishing[post.id]}
                        style={{ ...btnStyle(C.green), padding: '6px 12px', fontSize: '12px', opacity: publishing[post.id] ? 0.6 : 1 }}>
                        {publishing[post.id] ? '⏳ Publicando...' : '🚀 Publicar Agora'}
                      </button>
                    )}
                    <button onClick={() => {
                      const text = `${post.legenda || ''}\n\n${(post.hashtags || []).map(h => `#${h.replace(/^#/, '')}`).join(' ')}`;
                      navigator.clipboard.writeText(text);
                    }} style={{ ...btnStyle('rgba(255,255,255,0.1)'), padding: '6px 12px', fontSize: '12px' }}>
                      📋 Copiar
                    </button>
                    <button onClick={() => deletePost(post.id)}
                      style={{ ...btnStyle('rgba(239,68,68,0.2)'), padding: '6px 12px', fontSize: '12px', color: C.red }}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── VÍDEO → REELS ─── */}
      {subTab === 'video-to-reels' && (
        <div style={cardStyle}>
          <h3 style={{ color: C.text, margin: '0 0 8px' }}>🎬 Transformar Vídeo em Reels</h3>
          <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 16px' }}>
            Selecione um vídeo do VideoForge para criar um Reels com legenda e hashtags geradas por IA.
          </p>

          {videos.length === 0 ? (
            <p style={{ color: C.dim, textAlign: 'center', padding: '30px' }}>
              Nenhum vídeo pronto encontrado. Crie vídeos na aba principal primeiro.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {videos.slice(0, 20).map(v => (
                <div key={v.id} style={{
                  display: 'flex', gap: '12px', padding: '12px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, alignItems: 'center'
                }}>
                  {v.thumbnail_url && (
                    <img src={v.thumbnail_url} alt="" style={{ width: 60, height: 40, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: C.text, fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.titulo}
                    </p>
                    <p style={{ margin: 0, color: C.dim, fontSize: '11px' }}>
                      {v.duracao_segundos ? `${Math.round(v.duracao_segundos / 60)}min` : ''} · {new Date(v.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button onClick={() => createFromVideo(v.id)} style={{ ...btnStyle(C.accent), padding: '6px 12px', fontSize: '12px', flexShrink: 0 }}>
                    📱 Criar Reels
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MEDIA KIT ─── */}
      {subTab === 'media-kit' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: C.text, margin: 0 }}>🎯 Media Kit</h3>
            <button onClick={loadMediaKit} disabled={loadingKit || !igStatus?.connected}
              style={{ ...btnStyle(C.purple), opacity: loadingKit ? 0.6 : 1 }}>
              {loadingKit ? '⏳ ...' : '🔄 Gerar Media Kit'}
            </button>
          </div>

          {!igStatus?.connected && (
            <p style={{ color: C.yellow, fontSize: '13px' }}>⚠️ Conecte seu Instagram primeiro.</p>
          )}

          {mediaKit && (
            <div>
              {/* Header do Media Kit */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(228,64,95,0.1), rgba(139,92,246,0.1))',
                border: `1px solid rgba(228,64,95,0.2)`, borderRadius: '16px', padding: '24px',
                textAlign: 'center', marginBottom: '16px'
              }}>
                {mediaKit.profilePicture && (
                  <img src={mediaKit.profilePicture} alt="" style={{
                    width: 80, height: 80, borderRadius: '50%', border: `3px solid ${C.accent}`, marginBottom: '12px'
                  }} />
                )}
                <h3 style={{ color: C.text, margin: '0 0 4px' }}>@{mediaKit.username}</h3>
                {mediaKit.bio && <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 16px' }}>{mediaKit.bio}</p>}

                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
                  {[
                    { label: 'Seguidores', value: mediaKit.followers?.toLocaleString() || '—' },
                    { label: 'Posts', value: mediaKit.posts?.toLocaleString() || '—' },
                    { label: 'Eng. Médio', value: mediaKit.avgEngagement?.toLocaleString() || '—' },
                    { label: 'Taxa Eng.', value: mediaKit.engagementRate || '—' },
                  ].map((m, i) => (
                    <div key={i}>
                      <p style={{ margin: 0, color: C.accentLight, fontSize: '20px', fontWeight: 700 }}>{m.value}</p>
                      <p style={{ margin: 0, color: C.dim, fontSize: '11px' }}>{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Melhores formatos */}
              {Object.keys(mediaKit.bestFormats || {}).length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <h4 style={{ color: C.text, margin: '0 0 8px', fontSize: '14px' }}>📐 Formatos</h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {Object.entries(mediaKit.bestFormats).map(([type, data]) => (
                      <div key={type} style={{
                        background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px 16px', textAlign: 'center'
                      }}>
                        <p style={{ margin: 0, color: C.text, fontSize: '13px', fontWeight: 600 }}>{type}</p>
                        <p style={{ margin: 0, color: C.dim, fontSize: '11px' }}>{data.count} posts · ~{data.avgEngagement} eng.</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {mediaKit.bestHashtags?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <h4 style={{ color: C.text, margin: '0 0 8px', fontSize: '14px' }}># Top Hashtags</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {mediaKit.bestHashtags.map((h, i) => (
                      <span key={i} style={{
                        background: 'rgba(139,92,246,0.15)', borderRadius: '12px', padding: '3px 8px',
                        fontSize: '11px', color: '#a78bfa'
                      }}>{h.tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
