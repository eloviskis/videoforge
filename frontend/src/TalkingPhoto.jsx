import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : (window.location.port === '3000' ? 'http://localhost:3001/api' : `${window.location.origin}/api`)

const VOICES = [
  { id: 'alloy', label: 'Alloy', desc: 'Neutro, equilibrado', icon: '🎙️' },
  { id: 'echo', label: 'Echo', desc: 'Grave, masculino', icon: '🔊' },
  { id: 'fable', label: 'Fable', desc: 'Suave, narrativo', icon: '📖' },
  { id: 'onyx', label: 'Onyx', desc: 'Profundo, forte', icon: '🎵' },
  { id: 'nova', label: 'Nova', desc: 'Jovem, feminino', icon: '✨' },
  { id: 'shimmer', label: 'Shimmer', desc: 'Claro, feminino', icon: '💫' },
]

export default function TalkingPhoto({ onBack }) {
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [text, setText] = useState('')
  const [voice, setVoice] = useState('alloy')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState('')
  const [history, setHistory] = useState([])
  const [msg, setMsg] = useState('')
  const [playingVideo, setPlayingVideo] = useState(null)
  const fileRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => {
    loadHistory()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function loadHistory() {
    try {
      const { data } = await axios.get(`${API_URL}/talking-photo/history`)
      setHistory(data.items || [])
    } catch {}
  }

  function handlePhotoSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setMsg('Erro: Arquivo muito grande (máx 10MB)')
      return
    }
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleGenerate() {
    if (!photo || !text.trim()) return
    setGenerating(true)
    setProgress('📤 Enviando foto e texto...')
    setMsg('')

    try {
      const form = new FormData()
      form.append('photo', photo)
      form.append('text', text.trim())
      form.append('voice', voice)

      const { data } = await axios.post(`${API_URL}/talking-photo/generate`, form)
      const jobId = data.id
      setProgress('🎙️ Gerando narração...')

      // Poll status
      pollRef.current = setInterval(async () => {
        try {
          const { data: status } = await axios.get(`${API_URL}/talking-photo/${jobId}/status`)
          if (status.status === 'uploading') setProgress('📤 Enviando áudio para D-ID...')
          else if (status.status === 'generating') setProgress('🎭 D-ID gerando vídeo... (pode levar 1-2 min)')
          else if (status.status === 'ready') {
            clearInterval(pollRef.current)
            pollRef.current = null
            setGenerating(false)
            setProgress('')
            setMsg('✅ Vídeo gerado com sucesso!')
            setPlayingVideo(status.video_url)
            loadHistory()
            setTimeout(() => setMsg(''), 4000)
          } else if (status.status === 'error') {
            clearInterval(pollRef.current)
            pollRef.current = null
            setGenerating(false)
            setProgress('')
            setMsg('Erro: ' + (status.error_msg || 'Falha na geração'))
          }
        } catch {}
      }, 3000)

    } catch (err) {
      setGenerating(false)
      setProgress('')
      setMsg('Erro: ' + (err.response?.data?.error || err.message))
    }
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este vídeo?')) return
    try {
      await axios.delete(`${API_URL}/talking-photo/${id}`)
      loadHistory()
      if (playingVideo) setPlayingVideo(null)
      setMsg('✅ Excluído')
      setTimeout(() => setMsg(''), 2000)
    } catch (e) {
      setMsg('Erro: ' + (e.response?.data?.error || e.message))
    }
  }

  const charCount = text.length
  const charColor = charCount > 1800 ? '#ef4444' : charCount > 1000 ? '#f59e0b' : '#64748b'

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'rgba(15,15,35,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <button onClick={onBack} style={{
          padding: '6px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '13px',
        }}>← Voltar</button>
        <h1 style={{
          fontSize: '22px', fontWeight: 800, margin: 0,
          background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>🗣️ Talking Photo</h1>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: '11px', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px' }}>
          D-ID + OpenAI TTS
        </span>
      </div>

      {/* Mensagem */}
      {msg && (
        <div style={{
          textAlign: 'center', padding: '10px', fontSize: '13px', fontWeight: 600,
          background: msg.includes('Erro') ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
          color: msg.includes('Erro') ? '#fca5a5' : '#86efac',
        }}>{msg}</div>
      )}

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* ═══ COLUNA ESQUERDA — Preview + Upload ═══ */}
        <div style={{ flex: '1 1 400px', minWidth: '300px' }}>
          {/* Upload / Preview da foto */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)',
            borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s',
          }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)' }}
            onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; if (e.dataTransfer.files[0]) { const f = e.dataTransfer.files[0]; setPhoto(f); setPhotoPreview(URL.createObjectURL(f)) } }}
          >
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} style={{ display: 'none' }} />
            {photoPreview ? (
              <div style={{ position: 'relative' }}>
                <img src={photoPreview} alt="Foto" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
                <div style={{
                  position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.7)',
                  padding: '6px 12px', borderRadius: '8px', fontSize: '11px', color: '#94a3b8',
                }}>📷 Clique para trocar</div>
              </div>
            ) : (
              <div style={{
                padding: '60px 24px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '12px',
              }}>
                <div style={{ fontSize: '56px' }}>📸</div>
                <p style={{ color: '#94a3b8', fontSize: '15px', fontWeight: 600, margin: 0 }}>
                  Arraste ou clique para enviar uma foto
                </p>
                <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
                  JPG, PNG ou WebP • Máx 10MB • Rosto frontal com boa iluminação
                </p>
              </div>
            )}
          </div>

          {/* Vídeo resultado */}
          {playingVideo && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#86efac', marginBottom: '10px' }}>
                ✅ Vídeo Gerado
              </h3>
              <video src={playingVideo} controls style={{
                width: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
              }} />
              <a href={playingVideo} download style={{
                display: 'inline-block', marginTop: '8px', padding: '8px 20px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff',
                fontWeight: 600, fontSize: '13px', textDecoration: 'none',
              }}>⬇️ Baixar MP4</a>
            </div>
          )}

          {/* Dicas */}
          <div style={{
            marginTop: '20px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)',
            borderRadius: '10px', padding: '14px', fontSize: '12px', color: '#7dd3fc', lineHeight: 1.7,
          }}>
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>💡 Dicas para melhores resultados</div>
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              <li>Use fotos com <b>rosto frontal</b> e boa iluminação</li>
              <li>Evite óculos escuros ou objetos cobrindo o rosto</li>
              <li>Fotos com fundo neutro funcionam melhor</li>
              <li>Textos curtos (até 500 caracteres) ficam mais naturais</li>
            </ul>
          </div>
        </div>

        {/* ═══ COLUNA DIREITA — Texto + Voz + Histórico ═══ */}
        <div style={{ flex: '1 1 380px', minWidth: '300px' }}>
          {/* Texto */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
              Texto para narrar
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Digite o texto que a pessoa da foto irá narrar..."
              rows={5}
              maxLength={2000}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
                color: '#e2e8f0', fontSize: '14px', outline: 'none', resize: 'vertical',
                fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box',
                lineHeight: 1.6,
              }}
            />
            <div style={{ textAlign: 'right', fontSize: '11px', color: charColor, marginTop: '4px' }}>
              {charCount}/2000
            </div>
          </div>

          {/* Voz */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
              Voz da narração
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {VOICES.map(v => (
                <button key={v.id} onClick={() => setVoice(v.id)} style={{
                  padding: '10px 6px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: voice === v.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                  outline: voice === v.id ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                  textAlign: 'center', transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: '18px' }}>{v.icon}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: voice === v.id ? '#a5b4fc' : '#e2e8f0', marginTop: '2px' }}>{v.label}</div>
                  <div style={{ fontSize: '9px', color: '#64748b', marginTop: '1px' }}>{v.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Botão Gerar */}
          <button onClick={handleGenerate} disabled={generating || !photo || !text.trim()} style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            cursor: (generating || !photo || !text.trim()) ? 'not-allowed' : 'pointer',
            background: (generating || !photo || !text.trim()) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #6366f1, #818cf8)',
            color: (generating || !photo || !text.trim()) ? '#64748b' : '#fff',
            fontWeight: 700, fontSize: '15px', marginBottom: '12px',
            opacity: (generating || !photo || !text.trim()) ? 0.6 : 1,
          }}>
            {generating ? '⏳ Processando...' : '🗣️ Gerar Vídeo Narrado'}
          </button>

          {/* Progresso */}
          {generating && (
            <div style={{
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '10px', padding: '14px', marginBottom: '16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: 600 }}>{progress}</div>
              <div style={{
                width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)',
                borderRadius: '2px', marginTop: '10px', overflow: 'hidden',
              }}>
                <div style={{
                  width: '60%', height: '100%', background: 'linear-gradient(90deg, #6366f1, #a5b4fc)',
                  borderRadius: '2px', animation: 'shimmer 1.5s infinite',
                }} />
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', margin: '8px 0 0' }}>
                Não feche a página. D-ID pode levar 1-3 minutos.
              </p>
            </div>
          )}

          {/* Custo */}
          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '12px', color: '#fbbf24', lineHeight: 1.6,
          }}>
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>💰 Custo estimado por vídeo</div>
            <div>OpenAI TTS: ~$0.015 por 1000 caracteres</div>
            <div>D-ID: ~$0.05 por vídeo curto (depende do plano)</div>
          </div>

          {/* Histórico */}
          {history.length > 0 && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#a5b4fc', marginBottom: '10px' }}>
                📜 Histórico ({history.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {history.map(item => (
                  <div key={item.id} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    {item.photo_url && (
                      <img src={item.photo_url} alt="" style={{ width: 40, height: 40, borderRadius: '8px', objectFit: 'cover' }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.text}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#64748b' }}>
                        {item.status === 'ready' ? '✅ Pronto' : item.status === 'error' ? '❌ Erro' : '⏳ ' + item.status}
                        {' • '}{new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {item.status === 'ready' && item.video_url && (
                      <button onClick={() => setPlayingVideo(item.video_url)} style={{
                        padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: '11px', fontWeight: 600,
                      }}>▶ Ver</button>
                    )}
                    <button onClick={() => handleDelete(item.id)} style={{
                      padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                      background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: '11px',
                    }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%) } 100% { transform: translateX(200%) } }
      `}</style>
    </div>
  )
}
