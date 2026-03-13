import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : (window.location.port === '3000' ? 'http://localhost:3001/api' : `${window.location.origin}/api`)

const TIPOS = [
  { id: 'sugestao', label: '💡 Sugestão', color: '#a78bfa' },
  { id: 'bug', label: '🐛 Bug', color: '#f87171' },
  { id: 'elogio', label: '⭐ Elogio', color: '#fbbf24' },
  { id: 'outro', label: '📝 Outro', color: '#94a3b8' },
]

const STATUS_LABELS = {
  pendente: { label: '⏳ Pendente', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  visto: { label: '👁️ Visto', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  respondido: { label: '💬 Respondido', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  implementado: { label: '✅ Implementado', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  rejeitado: { label: '❌ Rejeitado', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
}

export default function FeedbackWall({ onBack, user }) {
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tipo: 'sugestao', titulo: '', mensagem: '' })
  const [mediaFile, setMediaFile] = useState(null)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState('todos')

  useEffect(() => { loadFeedbacks() }, [])

  async function loadFeedbacks() {
    try {
      setLoading(true)
      const { data } = await axios.get(`${API_URL}/feedback`)
      setFeedbacks(data)
    } catch (e) {
      setMsg('Erro ao carregar feedbacks')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.titulo.trim() || !form.mensagem.trim()) {
      setMsg('Preencha título e mensagem')
      return
    }
    try {
      setSending(true)
      const fd = new FormData()
      fd.append('tipo', form.tipo)
      fd.append('titulo', form.titulo)
      fd.append('mensagem', form.mensagem)
      if (mediaFile) fd.append('media', mediaFile)
      await axios.post(`${API_URL}/feedback`, fd)
      setForm({ tipo: 'sugestao', titulo: '', mensagem: '' })
      setMediaFile(null)
      setShowForm(false)
      setMsg('✅ Feedback enviado com sucesso!')
      loadFeedbacks()
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      setMsg('Erro ao enviar: ' + (e.response?.data?.error || e.message))
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este feedback?')) return
    try {
      await axios.delete(`${API_URL}/feedback/${id}`)
      setMsg('✅ Feedback excluído')
      loadFeedbacks()
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      setMsg('Erro: ' + (e.response?.data?.error || e.message))
    }
  }

  const filtered = filter === 'todos' ? feedbacks : feedbacks.filter(f => f.status === filter)

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a1a', color: '#e2e8f0',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(15,15,35,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <button onClick={onBack} style={{
          padding: '6px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '13px',
        }}>← Voltar</button>
        <h1 style={{
          fontSize: '22px', fontWeight: 800, margin: 0,
          background: 'linear-gradient(135deg, #8b5cf6, #c084fc)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          💬 Muro de Sugestões
        </h1>
        <span style={{ flex: 1 }} />
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '8px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
          background: showForm ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: showForm ? '#fca5a5' : '#fff', fontWeight: 700, fontSize: '14px',
        }}>
          {showForm ? '✕ Cancelar' : '✏️ Novo Feedback'}
        </button>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        {/* Mensagem */}
        {msg && (
          <div style={{
            padding: '10px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', fontWeight: 600,
            background: msg.startsWith('✅') ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            color: msg.startsWith('✅') ? '#86efac' : '#fca5a5',
            border: `1px solid ${msg.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>{msg}</div>
        )}

        {/* Info privacidade */}
        <div style={{
          padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
          background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
          fontSize: '13px', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          🔒 Seus feedbacks são privados — somente você e o administrador podem visualizá-los.
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: '16px', padding: '24px', marginBottom: '24px',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#c4b5fd' }}>
              ✏️ Enviar Feedback
            </h3>

            {/* Tipo */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                Tipo
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {TIPOS.map(t => (
                  <button
                    key={t.id} type="button"
                    onClick={() => setForm({ ...form, tipo: t.id })}
                    style={{
                      padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
                      border: form.tipo === t.id ? `2px solid ${t.color}` : '1px solid rgba(255,255,255,0.1)',
                      background: form.tipo === t.id ? `${t.color}20` : 'transparent',
                      color: form.tipo === t.id ? t.color : '#94a3b8',
                      fontWeight: 600, fontSize: '13px',
                    }}
                  >{t.label}</button>
                ))}
              </div>
            </div>

            {/* Título */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>
                Título
              </label>
              <input
                value={form.titulo}
                onChange={e => setForm({ ...form, titulo: e.target.value })}
                placeholder="Resumo curto do seu feedback..."
                maxLength={200}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
                  color: '#e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Mensagem */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>
                Mensagem
              </label>
              <textarea
                value={form.mensagem}
                onChange={e => setForm({ ...form, mensagem: e.target.value })}
                placeholder="Descreva sua sugestão, bug ou elogio em detalhes..."
                rows={5}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
                  color: '#e2e8f0', fontSize: '14px', outline: 'none', resize: 'vertical',
                  fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Anexo (print/vídeo) */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>
                📎 Anexo (opcional)
              </label>
              <div style={{
                border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '10px',
                padding: '14px', background: 'rgba(0,0,0,0.2)', textAlign: 'center',
              }}>
                {mediaFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#c4b5fd' }}>
                      {mediaFile.type.startsWith('video') ? '🎥' : '🖼️'} {mediaFile.name}
                      <span style={{ color: '#64748b', marginLeft: '8px' }}>({(mediaFile.size / 1024 / 1024).toFixed(1)}MB)</span>
                    </span>
                    <button type="button" onClick={() => setMediaFile(null)} style={{
                      background: 'rgba(239,68,68,0.2)', border: 'none', color: '#fca5a5',
                      borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px',
                    }}>✕ Remover</button>
                  </div>
                ) : (
                  <label style={{ cursor: 'pointer', color: '#94a3b8', fontSize: '13px' }}>
                    <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px' }}>📷</span>
                    Clique para anexar print ou vídeo curto (máx 10MB)
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm"
                      onChange={e => {
                        const f = e.target.files[0]
                        if (f && f.size > 10 * 1024 * 1024) {
                          alert('Arquivo muito grande (máx 10MB)')
                          return
                        }
                        setMediaFile(f || null)
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#4b5563' }}>
                Formatos: PNG, JPG, GIF, WEBP, MP4, WEBM
              </p>
            </div>

            <button type="submit" disabled={sending} style={{
              padding: '10px 28px', borderRadius: '10px', border: 'none', cursor: sending ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
              fontWeight: 700, fontSize: '14px', opacity: sending ? 0.6 : 1,
            }}>
              {sending ? '⏳ Enviando...' : '📨 Enviar Feedback'}
            </button>
          </form>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { id: 'todos', label: '📋 Todos' },
            { id: 'pendente', label: '⏳ Pendentes' },
            { id: 'respondido', label: '💬 Respondidos' },
            { id: 'implementado', label: '✅ Implementados' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '5px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: filter === f.id ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
              color: filter === f.id ? '#c4b5fd' : '#64748b',
              fontWeight: 600, fontSize: '12px',
            }}>{f.label}</button>
          ))}
        </div>

        {/* Lista de feedbacks */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            ⏳ Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
            border: '1px dashed rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
            <h3 style={{ color: '#94a3b8', fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>
              {filter !== 'todos' ? 'Nenhum feedback com esse filtro' : 'Nenhum feedback ainda'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
              {filter === 'todos' ? 'Clique em "Novo Feedback" para enviar sua primeira sugestão!' : 'Tente outro filtro.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filtered.map(fb => {
              const tipoInfo = TIPOS.find(t => t.id === fb.tipo) || TIPOS[3]
              const statusInfo = STATUS_LABELS[fb.status] || STATUS_LABELS.pendente
              return (
                <div key={fb.id} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px', padding: '20px', transition: 'border-color 0.2s',
                  borderLeft: `4px solid ${tipoInfo.color}`,
                }}>
                  {/* Header do card */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                      background: `${tipoInfo.color}20`, color: tipoInfo.color,
                    }}>{tipoInfo.label}</span>
                    <span style={{
                      padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                      background: statusInfo.bg, color: statusInfo.color,
                    }}>{statusInfo.label}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {new Date(fb.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {fb.status === 'pendente' && (
                      <button onClick={() => handleDelete(fb.id)} style={{
                        background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                        fontSize: '14px', padding: '2px 6px',
                      }} title="Excluir">🗑️</button>
                    )}
                  </div>

                  {/* Título */}
                  <h4 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 700, color: '#e2e8f0' }}>
                    {fb.titulo}
                  </h4>

                  {/* Mensagem */}
                  <p style={{
                    margin: '0 0 12px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {fb.mensagem}
                  </p>

                  {/* Anexo */}
                  {fb.media_url && (
                    <div style={{ marginBottom: '12px' }}>
                      {fb.media_url.match(/\.(mp4|webm|mov)$/i) ? (
                        <video
                          src={fb.media_url}
                          controls
                          style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      ) : (
                        <a href={fb.media_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={fb.media_url}
                            alt="Anexo"
                            style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                          />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Resposta do admin */}
                  {fb.resposta_admin && (
                    <div style={{
                      background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                      borderRadius: '10px', padding: '14px', marginTop: '8px',
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🛡️ Resposta do Admin
                        {fb.respondido_em && (
                          <span style={{ fontWeight: 400, color: '#64748b', fontSize: '11px' }}>
                            — {new Date(fb.respondido_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#c4b5fd', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {fb.resposta_admin}
                      </p>
                      {fb.resposta_media_url && (
                        <div style={{ marginTop: '8px' }}>
                          {fb.resposta_media_url.match(/\.(mp4|webm|mov)$/i) ? (
                            <video src={fb.resposta_media_url} controls style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.2)' }} />
                          ) : (
                            <a href={fb.resposta_media_url} target="_blank" rel="noopener noreferrer">
                              <img src={fb.resposta_media_url} alt="Anexo" style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.2)', cursor: 'pointer' }} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
