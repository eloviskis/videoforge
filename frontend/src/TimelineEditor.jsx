import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : (window.location.port === '3000' ? 'http://localhost:3001/api' : `${window.location.origin}/api`)

// ─── Cores / Tema ────────────────────────────
const COLORS = {
  bg: '#0f0f1a',
  card: '#1a1a2e',
  cardHover: '#22223a',
  border: '#2a2a4a',
  accent: '#8b5cf6',
  accentLight: '#a78bfa',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#fbbf24',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  timeline: '#16162a',
  clipBg: '#2d2d5e',
  clipSelected: '#4c3f91',
}

export default function TimelineEditor({ token }) {
  const [project, setProject] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedClip, setSelectedClip] = useState(null)
  const [generatingScript, setGeneratingScript] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [renderProgress, setRenderProgress] = useState(0)
  const [previewClip, setPreviewClip] = useState(null)
  const [scriptTom, setScriptTom] = useState('narração envolvente de documentário')
  const [scriptInstrucoes, setScriptInstrucoes] = useState('')
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [showProjectList, setShowProjectList] = useState(true)
  const [projectName, setProjectName] = useState('Meu Projeto')
  const [fileDragOver, setFileDragOver] = useState(false)
  const [generatingNarration, setGeneratingNarration] = useState(false)
  const [narrationProgress, setNarrationProgress] = useState(0)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [audioUploadProgress, setAudioUploadProgress] = useState(0)
  const [selectedVoz, setSelectedVoz] = useState('pt-BR-AntonioNeural')
  const [selectedVelocidade, setSelectedVelocidade] = useState('+0%')
  const [narrationVolume, setNarrationVolume] = useState(1.0)
  const [activeAudioSection, setActiveAudioSection] = useState('narration') // narration | tracks
  const [aiEditing, setAiEditing] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [editEstilo, setEditEstilo] = useState('dinâmico e envolvente')
  const [expandedClip, setExpandedClip] = useState(null)

  const fileInputRef = useRef(null)
  const audioInputRef = useRef(null)
  const videoRef = useRef(null)
  const pollRef = useRef(null)
  const narrPollRef = useRef(null)

  const headers = { Authorization: `Bearer ${token}` }

  // ── Carregar projetos ─────────────────────
  useEffect(() => {
    loadProjects()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (narrPollRef.current) clearInterval(narrPollRef.current)
    }
  }, [])

  const loadProjects = async () => {
    try {
      const r = await axios.get(`${API_URL}/timeline/projects`, { headers })
      setProjects(r.data)
    } catch {}
  }

  // ── Criar projeto ─────────────────────────
  const createProject = async () => {
    setLoading(true)
    try {
      const r = await axios.post(`${API_URL}/timeline/projects`, { name: projectName }, { headers })
      setProject(r.data)
      setShowProjectList(false)
      await loadProjects()
    } catch (e) {
      alert('Erro ao criar projeto: ' + (e.response?.data?.error || e.message))
    } finally {
      setLoading(false)
    }
  }

  // ── Deletar projeto ───────────────────────
  const deleteProject = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.')) return
    try {
      await axios.delete(`${API_URL}/timeline/projects/${id}`, { headers })
      await loadProjects()
    } catch (err) {
      alert('Erro ao excluir: ' + (err.response?.data?.error || err.message))
    }
  }

  // ── Abrir projeto ─────────────────────────
  const openProject = async (id) => {
    setLoading(true)
    try {
      const r = await axios.get(`${API_URL}/timeline/projects/${id}`, { headers })
      setProject(r.data)
      setShowProjectList(false)
    } catch (e) {
      alert('Erro: ' + (e.response?.data?.error || e.message))
    } finally {
      setLoading(false)
    }
  }

  // ── Upload de clipes ──────────────────────
  const handleUpload = async (e) => {
    const files = e.target.files
    if (!files?.length || !project) return

    setUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    Array.from(files).forEach(f => formData.append('clips', f))

    try {
      const r = await axios.post(
        `${API_URL}/timeline/projects/${project.id}/clips`,
        formData,
        {
          headers: { ...headers, 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded / p.total) * 100))
        }
      )
      // Recarregar projeto
      const updated = await axios.get(`${API_URL}/timeline/projects/${project.id}`, { headers })
      setProject(updated.data)
    } catch (e) {
      alert('Erro upload: ' + (e.response?.data?.error || e.message))
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Drag & Drop de arquivos ───────────────
  const handleFileDrop = (e) => {
    e.preventDefault()
    setFileDragOver(false)
    if (!project) return
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/') || f.name.match(/\.(mp4|webm|mov|avi|mkv)$/i))
    if (files.length === 0) return
    // Simular upload como se viesse do input
    const dt = new DataTransfer()
    files.forEach(f => dt.items.add(f))
    handleUpload({ target: { files: dt.files } })
  }

  const handleFileDragOver = (e) => {
    e.preventDefault()
    setFileDragOver(true)
  }

  const handleFileDragLeave = (e) => {
    e.preventDefault()
    setFileDragOver(false)
  }

  // ── Remover clipe ─────────────────────────
  const removeClip = async (clipId) => {
    if (!project) return
    try {
      const r = await axios.delete(`${API_URL}/timeline/projects/${project.id}/clips/${clipId}`, { headers })
      setProject(r.data)
      if (selectedClip === clipId) setSelectedClip(null)
    } catch (e) {
      alert('Erro: ' + (e.response?.data?.error || e.message))
    }
  }

  // ── Drag & Drop reordenar ─────────────────
  const [draggedClip, setDraggedClip] = useState(null)

  const handleDragStart = (clipId) => {
    setDraggedClip(clipId)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault()
    setDragOverIndex(null)
    if (!draggedClip || !project) return

    const clips = [...project.clips]
    const fromIndex = clips.findIndex(c => c.id === draggedClip)
    if (fromIndex === -1) return

    const [moved] = clips.splice(fromIndex, 1)
    clips.splice(targetIndex, 0, moved)
    clips.forEach((c, i) => c.order = i)

    setProject({ ...project, clips })
    setDraggedClip(null)

    // Salvar no backend
    try {
      await axios.put(
        `${API_URL}/timeline/projects/${project.id}/clips`,
        { clips: clips.map(c => ({ id: c.id, order: c.order })) },
        { headers }
      )
    } catch {}
  }

  // ── Trim controls ─────────────────────────
  const updateTrim = async (clipId, field, value) => {
    const clips = project.clips.map(c => {
      if (c.id === clipId) {
        return { ...c, [field]: parseFloat(value) }
      }
      return c
    })
    setProject({ ...project, clips })

    try {
      await axios.put(
        `${API_URL}/timeline/projects/${project.id}/clips`,
        { clips: [{ id: clipId, [field]: parseFloat(value) }] },
        { headers }
      )
    } catch {}
  }

  // ── Atualizar campo genérico do clipe ─────
  const updateClipField = async (clipId, field, value) => {
    const clips = project.clips.map(c =>
      c.id === clipId ? { ...c, [field]: value } : c
    )
    setProject({ ...project, clips })
    try {
      await axios.put(
        `${API_URL}/timeline/projects/${project.id}/clips`,
        { clips: [{ id: clipId, [field]: value }] },
        { headers }
      )
    } catch {}
  }

  // ── IA Auto-Edit ──────────────────────────
  const aiAutoEdit = async () => {
    if (!project?.clips?.length) return
    setAiEditing(true)
    setAiSuggestions(null)
    try {
      const r = await axios.post(
        `${API_URL}/timeline/projects/${project.id}/ai-edit`,
        { estilo: editEstilo },
        { headers, timeout: 120000 }
      )
      setAiSuggestions(r.data)
    } catch (e) {
      alert('Erro IA Edit: ' + (e.response?.data?.error || e.message))
    } finally {
      setAiEditing(false)
    }
  }

  // ── Aplicar sugestões da IA ───────────────
  const applyAiSuggestions = async () => {
    if (!aiSuggestions?.sugestoes) return
    try {
      const r = await axios.post(
        `${API_URL}/timeline/projects/${project.id}/apply-ai-edit`,
        { sugestoes: aiSuggestions.sugestoes },
        { headers }
      )
      setProject(r.data)
      setAiSuggestions(null)
      alert('✅ Edições da IA aplicadas!')
    } catch (e) {
      alert('Erro: ' + (e.response?.data?.error || e.message))
    }
  }

  // ── Gerar roteiro com IA ──────────────────
  const generateScript = async () => {
    if (!project || project.clips.length === 0) return
    setGeneratingScript(true)
    try {
      const r = await axios.post(
        `${API_URL}/timeline/projects/${project.id}/generate-script`,
        { tom: scriptTom, instrucoes: scriptInstrucoes },
        { headers, timeout: 120000 }
      )
      setProject(prev => ({ ...prev, roteiro: r.data }))
    } catch (e) {
      alert('Erro ao gerar roteiro: ' + (e.response?.data?.error || e.message))
    } finally {
      setGeneratingScript(false)
    }
  }

  // ── Editar narração de cena ───────────────
  const updateNarracao = (clipNum, newText) => {
    if (!project?.roteiro?.cenas) return
    const cenas = project.roteiro.cenas.map(c =>
      c.clipNum === clipNum ? { ...c, narracao: newText } : c
    )
    const roteiro = { ...project.roteiro, cenas }
    setProject(prev => ({ ...prev, roteiro }))

    // Salvar
    axios.put(
      `${API_URL}/timeline/projects/${project.id}/script`,
      { roteiro },
      { headers }
    ).catch(() => {})
  }

  // ── Gerar Narração (TTS) ──────────────────
  const generateNarration = async () => {
    if (!project?.roteiro?.cenas?.length) return
    setGeneratingNarration(true)
    setNarrationProgress(0)
    try {
      await axios.post(
        `${API_URL}/timeline/projects/${project.id}/generate-narration`,
        { voz: selectedVoz, velocidade: selectedVelocidade },
        { headers }
      )

      // Polling de progresso
      narrPollRef.current = setInterval(async () => {
        try {
          const r = await axios.get(`${API_URL}/timeline/projects/${project.id}/narration-status`, { headers })
          setNarrationProgress(r.data.progress || 0)
          if (r.data.status === 'done') {
            clearInterval(narrPollRef.current)
            narrPollRef.current = null
            setGeneratingNarration(false)
            setProject(prev => ({
              ...prev,
              narrationFile: r.data.narrationFile,
              narrationDurations: r.data.narrationDurations,
              narrationStatus: 'done'
            }))
          } else if (r.data.status === 'error') {
            clearInterval(narrPollRef.current)
            narrPollRef.current = null
            setGeneratingNarration(false)
            alert('❌ Erro na narração: ' + r.data.error)
          }
        } catch {}
      }, 2000)
    } catch (e) {
      setGeneratingNarration(false)
      alert('Erro: ' + (e.response?.data?.error || e.message))
    }
  }

  // ── Upload de áudio ───────────────────────
  const handleAudioUpload = async (e) => {
    const files = e.target.files
    if (!files?.length || !project) return

    setUploadingAudio(true)
    setAudioUploadProgress(0)

    const formData = new FormData()
    Array.from(files).forEach(f => formData.append('audios', f))

    try {
      await axios.post(
        `${API_URL}/timeline/projects/${project.id}/audio-tracks`,
        formData,
        {
          headers: { ...headers, 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (p) => setAudioUploadProgress(Math.round((p.loaded / p.total) * 100))
        }
      )
      const updated = await axios.get(`${API_URL}/timeline/projects/${project.id}`, { headers })
      setProject(updated.data)
    } catch (e) {
      alert('Erro upload áudio: ' + (e.response?.data?.error || e.message))
    } finally {
      setUploadingAudio(false)
      setAudioUploadProgress(0)
      if (audioInputRef.current) audioInputRef.current.value = ''
    }
  }

  // ── Atualizar faixa de áudio ──────────────
  const updateAudioTrack = async (trackId, field, value) => {
    setProject(prev => ({
      ...prev,
      audioTracks: (prev.audioTracks || []).map(t =>
        t.id === trackId ? { ...t, [field]: value } : t
      )
    }))

    try {
      await axios.put(
        `${API_URL}/timeline/projects/${project.id}/audio-tracks/${trackId}`,
        { [field]: value },
        { headers }
      )
    } catch {}
  }

  // ── Remover faixa de áudio ────────────────
  const removeAudioTrack = async (trackId) => {
    try {
      await axios.delete(`${API_URL}/timeline/projects/${project.id}/audio-tracks/${trackId}`, { headers })
      setProject(prev => ({
        ...prev,
        audioTracks: (prev.audioTracks || []).filter(t => t.id !== trackId)
      }))
    } catch (e) {
      alert('Erro: ' + (e.response?.data?.error || e.message))
    }
  }

  // ── Renderizar ────────────────────────────
  const startRender = async () => {
    if (!project) return
    setRendering(true)
    setRenderProgress(0)
    try {
      await axios.post(`${API_URL}/timeline/projects/${project.id}/render`, {}, { headers })

      // Polling de progresso
      pollRef.current = setInterval(async () => {
        try {
          const r = await axios.get(`${API_URL}/timeline/projects/${project.id}/status`, { headers })
          setRenderProgress(r.data.progress || 0)
          if (r.data.status === 'done') {
            clearInterval(pollRef.current)
            pollRef.current = null
            setRendering(false)
            setProject(prev => ({ ...prev, status: 'done', outputFile: r.data.outputFile }))
            alert('✅ Vídeo renderizado com sucesso!')
          } else if (r.data.status === 'error') {
            clearInterval(pollRef.current)
            pollRef.current = null
            setRendering(false)
            alert('❌ Erro: ' + r.data.error)
          }
        } catch {}
      }, 2000)
    } catch (e) {
      setRendering(false)
      alert('Erro: ' + (e.response?.data?.error || e.message))
    }
  }

  // ── Duração total ─────────────────────────
  const totalDuration = project?.clips?.reduce((s, c) => s + (c.trimEnd - c.trimStart) / (c.speed || 1), 0) || 0

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  // ── Lista de Projetos ─────────────────────
  if (showProjectList) {
    return (
      <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: COLORS.text }}>🎞️ Editor de Timeline</h2>
        </div>

        {/* Criar novo */}
        <div style={{
          background: COLORS.card, border: `2px dashed ${COLORS.accent}`, borderRadius: '12px',
          padding: '32px', textAlign: 'center', marginBottom: '24px'
        }}>
          <h3 style={{ color: COLORS.accentLight, margin: '0 0 16px' }}>➕ Novo Projeto</h3>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Nome do projeto"
              style={{
                padding: '10px 16px', borderRadius: '8px', border: `1px solid ${COLORS.border}`,
                background: COLORS.bg, color: COLORS.text, fontSize: '14px', width: '280px'
              }}
            />
            <button
              onClick={createProject}
              disabled={loading}
              style={{
                padding: '10px 24px', borderRadius: '8px', border: 'none',
                background: COLORS.accent, color: '#fff', fontWeight: 'bold',
                cursor: loading ? 'wait' : 'pointer', fontSize: '14px'
              }}
            >
              {loading ? '⏳ Criando...' : '🎬 Criar Projeto'}
            </button>
          </div>
        </div>

        {/* Lista de projetos existentes */}
        {projects.length > 0 && (
          <div>
            <h3 style={{ color: COLORS.textMuted, fontSize: '14px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Projetos Recentes
            </h3>
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => openProject(p.id)}
                style={{
                  background: COLORS.card, borderRadius: '10px', padding: '16px 20px',
                  marginBottom: '8px', cursor: 'pointer', display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center',
                  border: `1px solid ${COLORS.border}`, transition: 'border-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
              >
                <div>
                  <div style={{ color: COLORS.text, fontWeight: 600, fontSize: '15px' }}>{p.name}</div>
                  <div style={{ color: COLORS.textDim, fontSize: '12px', marginTop: '4px' }}>
                    {p.clipCount} clipe{p.clipCount !== 1 ? 's' : ''} • {p.status === 'done' ? '✅ Pronto' : p.status === 'rendering' ? '⏳ Renderizando' : '📝 Editando'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: COLORS.textDim, fontSize: '12px' }}>
                    {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                  <button
                    onClick={(e) => deleteProject(p.id, e)}
                    style={{
                      background: 'none', border: 'none', color: COLORS.red,
                      cursor: 'pointer', fontSize: '16px', padding: '4px 6px',
                      borderRadius: '4px', opacity: 0.6, transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                    title="Excluir projeto"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Editor Principal ──────────────────────
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '80vh', position: 'relative' }}
      onDragOver={handleFileDragOver}
      onDragLeave={handleFileDragLeave}
      onDrop={handleFileDrop}
    >
      {/* Overlay de drag-and-drop */}
      {fileDragOver && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(139, 92, 246, 0.15)', border: '3px dashed #8b5cf6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '12px', pointerEvents: 'none'
        }}>
          <div style={{
            background: COLORS.card, padding: '24px 40px', borderRadius: '12px',
            color: COLORS.accent, fontSize: '18px', fontWeight: 700,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}>
            📂 Solte os vídeos aqui para adicionar à timeline
          </div>
        </div>
      )}

      {/* ── HEADER ──────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px', background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => { setShowProjectList(true); setProject(null) }}
            style={{
              background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.textMuted,
              padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
            }}
          >
            ← Projetos
          </button>
          <h3 style={{ margin: 0, color: COLORS.text, fontSize: '16px' }}>
            🎞️ {project?.name || 'Projeto'}
          </h3>
          <span style={{ color: COLORS.textDim, fontSize: '12px' }}>
            {project?.clips?.length || 0} clipes • {formatTime(totalDuration)}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: COLORS.accent, color: '#fff', cursor: 'pointer',
              fontWeight: 600, fontSize: '13px', opacity: uploading ? 0.6 : 1
            }}
          >
            {uploading ? `⏳ ${uploadProgress}%` : '📁 Adicionar Clipes'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*"
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
          <input
            ref={audioInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.ogg,.aac,.m4a,.flac"
            onChange={handleAudioUpload}
            style={{ display: 'none' }}
          />

          <button
            onClick={aiAutoEdit}
            disabled={aiEditing || !project?.clips?.length}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: '#7c3aed', color: '#fff',
              cursor: project?.clips?.length && !aiEditing ? 'pointer' : 'not-allowed',
              fontWeight: 600, fontSize: '13px', opacity: aiEditing ? 0.6 : 1
            }}
          >
            {aiEditing ? '⏳ IA Analisando...' : '🤖 Edição Inteligente'}
          </button>
          <button
            onClick={startRender}
            disabled={rendering || !project?.clips?.length}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: project?.clips?.length ? COLORS.green : '#333',
              color: '#fff', cursor: project?.clips?.length ? 'pointer' : 'not-allowed',
              fontWeight: 600, fontSize: '13px'
            }}
          >
            {rendering ? `⏳ Renderizando ${renderProgress}%` : '🎬 Renderizar Vídeo'}
          </button>
        </div>
      </div>

      {/* ── CORPO: 2 colunas ──────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: window.innerWidth <= 768 ? 'column' : 'row' }}>

        {/* ── COLUNA ESQUERDA: Preview + Roteiro ── */}
        <div style={{
          width: window.innerWidth <= 768 ? '100%' : '45%', maxWidth: window.innerWidth <= 768 ? 'none' : '550px', display: 'flex', flexDirection: 'column',
          borderRight: window.innerWidth <= 768 ? 'none' : `1px solid ${COLORS.border}`, 
          borderBottom: window.innerWidth <= 768 ? `1px solid ${COLORS.border}` : 'none',
          background: COLORS.bg
        }}>

          {/* ─ Preview ─ */}
          <div style={{
            background: '#000', aspectRatio: '16/9', display: 'flex',
            alignItems: 'center', justifyContent: 'center', position: 'relative'
          }}>
            {previewClip ? (
              <video
                ref={videoRef}
                key={previewClip}
                src={previewClip}
                controls
                autoPlay
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ color: COLORS.textDim, textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎬</div>
                <div style={{ fontSize: '14px' }}>Clique em um clipe para pré-visualizar</div>
              </div>
            )}
          </div>

          {/* ─ Seção Roteiro IA + Narração + Áudio ─ */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>

            {/* ── Sub-tabs: Roteiro | Narração | Áudio ── */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
              {[
                { key: 'narration', icon: '🤖', label: 'Roteiro & Voz' },
                { key: 'tracks', icon: '🎵', label: 'Faixas de Áudio' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveAudioSection(tab.key)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
                    background: activeAudioSection === tab.key ? COLORS.accent : COLORS.card,
                    color: activeAudioSection === tab.key ? '#fff' : COLORS.textMuted,
                    cursor: 'pointer', fontWeight: 600, fontSize: '12px'
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* ══════════════════════════════════════ */}
            {/* ROTEIRO & NARRAÇÃO */}
            {/* ══════════════════════════════════════ */}
            {activeAudioSection === 'narration' && (
              <div>
                {!project?.roteiro ? (
                  <div>
                    <p style={{ color: COLORS.textDim, fontSize: '13px', margin: '0 0 12px' }}>
                      A IA analisa os frames dos seus clipes e cria um roteiro com narração, legendas e sugestão de música.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      <input
                        type="text"
                        value={scriptTom}
                        onChange={(e) => setScriptTom(e.target.value)}
                        placeholder="Tom da narração (ex: documentário, energético, misterioso)"
                        style={{
                          padding: '8px 12px', borderRadius: '6px', border: `1px solid ${COLORS.border}`,
                          background: COLORS.card, color: COLORS.text, fontSize: '13px'
                        }}
                      />
                      <textarea
                        value={scriptInstrucoes}
                        onChange={(e) => setScriptInstrucoes(e.target.value)}
                        placeholder="Instruções extras (opcional): contexto, público-alvo, palavras-chave..."
                        rows={2}
                        style={{
                          padding: '8px 12px', borderRadius: '6px', border: `1px solid ${COLORS.border}`,
                          background: COLORS.card, color: COLORS.text, fontSize: '13px', resize: 'vertical'
                        }}
                      />
                    </div>
                    <button
                      onClick={generateScript}
                      disabled={generatingScript || !project?.clips?.length}
                      style={{
                        width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
                        background: generatingScript ? '#555' : COLORS.accent, color: '#fff',
                        fontWeight: 600, cursor: generatingScript ? 'wait' : 'pointer', fontSize: '14px'
                      }}
                    >
                      {generatingScript ? '🔄 Analisando vídeos e gerando roteiro...' : '✨ Gerar Roteiro com IA'}
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Info do roteiro */}
                    <div style={{
                      background: COLORS.card, borderRadius: '8px', padding: '12px',
                      marginBottom: '12px', border: `1px solid ${COLORS.border}`
                    }}>
                      <div style={{ color: COLORS.text, fontWeight: 600, fontSize: '14px' }}>
                        {project.roteiro.titulo}
                      </div>
                      <div style={{ color: COLORS.textDim, fontSize: '12px', marginTop: '4px' }}>
                        {project.roteiro.descricao}
                      </div>
                      {project.roteiro.musicaSugerida && (
                        <div style={{ color: COLORS.yellow, fontSize: '12px', marginTop: '6px' }}>
                          🎵 {project.roteiro.musicaSugerida}
                        </div>
                      )}
                    </div>

                    {/* ── Gerador de Narração TTS ── */}
                    <div style={{
                      background: COLORS.card, borderRadius: '8px', padding: '12px',
                      marginBottom: '12px', border: `1px solid ${project.narrationStatus === 'done' ? COLORS.green : COLORS.border}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: COLORS.accentLight, fontSize: '13px', fontWeight: 600 }}>
                          🎙️ Narração por Voz (TTS)
                        </span>
                        {project.narrationStatus === 'done' && (
                          <span style={{ color: COLORS.green, fontSize: '11px' }}>✅ Gerada</span>
                        )}
                      </div>

                      {project.narrationStatus !== 'done' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select
                              value={selectedVoz}
                              onChange={(e) => setSelectedVoz(e.target.value)}
                              style={{
                                flex: 1, padding: '6px 8px', borderRadius: '6px',
                                border: `1px solid ${COLORS.border}`, background: COLORS.bg,
                                color: COLORS.text, fontSize: '12px'
                              }}
                            >
                              <optgroup label="Português BR">
                                <option value="pt-BR-AntonioNeural">🎙️ Antonio (Masculino)</option>
                                <option value="pt-BR-FranciscaNeural">🎙️ Francisca (Feminino)</option>
                                <option value="pt-BR-ThalitaNeural">🎙️ Thalita (Feminino)</option>
                              </optgroup>
                              <optgroup label="English">
                                <option value="en-US-GuyNeural">🎙️ Guy (Male)</option>
                                <option value="en-US-JennyNeural">🎙️ Jenny (Female)</option>
                                <option value="en-US-AriaNeural">🎙️ Aria (Female)</option>
                              </optgroup>
                              <optgroup label="Español">
                                <option value="es-ES-AlvaroNeural">🎙️ Alvaro (Masculino)</option>
                                <option value="es-ES-ElviraNeural">🎙️ Elvira (Feminino)</option>
                              </optgroup>
                            </select>
                            <select
                              value={selectedVelocidade}
                              onChange={(e) => setSelectedVelocidade(e.target.value)}
                              style={{
                                width: '90px', padding: '6px 8px', borderRadius: '6px',
                                border: `1px solid ${COLORS.border}`, background: COLORS.bg,
                                color: COLORS.text, fontSize: '12px'
                              }}
                            >
                              <option value="-20%">Lenta</option>
                              <option value="-10%">Devagar</option>
                              <option value="+0%">Normal</option>
                              <option value="+8%">Rápida</option>
                              <option value="+15%">Muito rápida</option>
                            </select>
                          </div>
                          <button
                            onClick={generateNarration}
                            disabled={generatingNarration}
                            style={{
                              width: '100%', padding: '8px', borderRadius: '6px', border: 'none',
                              background: generatingNarration ? '#555' : '#22c55e', color: '#fff',
                              fontWeight: 600, cursor: generatingNarration ? 'wait' : 'pointer', fontSize: '13px'
                            }}
                          >
                            {generatingNarration
                              ? `⏳ Gerando narração... ${narrationProgress}%`
                              : '🎙️ Gerar Narração do Roteiro'}
                          </button>
                          {generatingNarration && (
                            <div style={{ height: '4px', borderRadius: '2px', background: COLORS.border, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${narrationProgress}%`,
                                background: COLORS.green, transition: 'width 0.5s'
                              }} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {/* Player de narração */}
                          <audio
                            controls
                            src={`${API_URL}/timeline/projects/${project.id}/files/${project.narrationFile}`}
                            style={{ width: '100%', height: '32px' }}
                          />
                          {/* Volume da narração */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: COLORS.textDim, fontSize: '11px', whiteSpace: 'nowrap' }}>🔊 Volume:</span>
                            <input
                              type="range"
                              min="0" max="2" step="0.05"
                              value={narrationVolume}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value)
                                setNarrationVolume(v)
                                setProject(prev => ({ ...prev, narrationVolume: v }))
                              }}
                              style={{ flex: 1, accentColor: COLORS.accent }}
                            />
                            <span style={{ color: COLORS.text, fontSize: '11px', minWidth: '32px' }}>
                              {Math.round(narrationVolume * 100)}%
                            </span>
                          </div>
                          {/* Durações por cena */}
                          {project.narrationDurations && (
                            <div style={{ color: COLORS.textDim, fontSize: '10px' }}>
                              Durações: {project.narrationDurations.map((d, i) => `C${i + 1}: ${d.toFixed(1)}s`).join(' | ')}
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setProject(prev => ({ ...prev, narrationStatus: null, narrationFile: null }))
                              generateNarration()
                            }}
                            style={{
                              width: '100%', padding: '6px', borderRadius: '6px',
                              border: `1px solid ${COLORS.border}`, background: 'transparent',
                              color: COLORS.textDim, cursor: 'pointer', fontSize: '11px'
                            }}
                          >
                            🔄 Regerar Narração
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Narrações por cena (editáveis) */}
                    {project.roteiro.cenas?.map((cena, i) => (
                      <div key={i} style={{
                        background: selectedClip === project.clips[i]?.id ? COLORS.clipSelected : COLORS.card,
                        borderRadius: '8px', padding: '10px 12px', marginBottom: '6px',
                        border: `1px solid ${COLORS.border}`, transition: 'background 0.2s'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: COLORS.accentLight, fontSize: '12px', fontWeight: 600 }}>
                            Clipe {cena.clipNum}
                            {project.narrationDurations?.[i] && (
                              <span style={{ color: COLORS.textDim, fontWeight: 400 }}> ({project.narrationDurations[i].toFixed(1)}s)</span>
                            )}
                          </span>
                          {cena.legendaDestaque && (
                            <span style={{ color: COLORS.yellow, fontSize: '11px', fontStyle: 'italic' }}>
                              📝 {cena.legendaDestaque}
                            </span>
                          )}
                        </div>
                        <textarea
                          value={cena.narracao}
                          onChange={(e) => updateNarracao(cena.clipNum, e.target.value)}
                          rows={3}
                          style={{
                            width: '100%', padding: '8px', borderRadius: '6px',
                            border: `1px solid ${COLORS.border}`, background: COLORS.bg,
                            color: COLORS.text, fontSize: '12px', resize: 'vertical',
                            boxSizing: 'border-box'
                          }}
                        />
                        {cena.transicao && cena.transicao !== 'none' && (
                          <div style={{ color: COLORS.textDim, fontSize: '10px', marginTop: '4px', textAlign: 'right' }}>
                            ↓ {cena.transicao}
                          </div>
                        )}
                      </div>
                    ))}

                    <button
                      onClick={() => { setProject(prev => ({ ...prev, roteiro: null, narrationStatus: null, narrationFile: null })) }}
                      style={{
                        width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${COLORS.border}`,
                        background: 'transparent', color: COLORS.textDim, cursor: 'pointer',
                        fontSize: '12px', marginTop: '8px'
                      }}
                    >
                      🔄 Regenerar Roteiro
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════ */}
            {/* FAIXAS DE ÁUDIO (música, efeitos) */}
            {/* ══════════════════════════════════════ */}
            {activeAudioSection === 'tracks' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ color: COLORS.textMuted, fontSize: '13px' }}>
                    🎵 Músicas e efeitos sonoros
                  </span>
                  <button
                    onClick={() => audioInputRef.current?.click()}
                    disabled={uploadingAudio}
                    style={{
                      padding: '6px 14px', borderRadius: '6px', border: 'none',
                      background: COLORS.accent, color: '#fff', cursor: 'pointer',
                      fontWeight: 600, fontSize: '12px', opacity: uploadingAudio ? 0.6 : 1
                    }}
                  >
                    {uploadingAudio ? `⏳ ${audioUploadProgress}%` : '➕ Adicionar Áudio'}
                  </button>
                </div>

                {(!project?.audioTracks || project.audioTracks.length === 0) ? (
                  <div style={{
                    background: COLORS.card, borderRadius: '8px', padding: '24px',
                    textAlign: 'center', border: `2px dashed ${COLORS.border}`
                  }}>
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎵</div>
                    <p style={{ color: COLORS.textDim, fontSize: '13px', margin: '0 0 8px' }}>
                      Nenhuma faixa de áudio adicionada
                    </p>
                    <p style={{ color: COLORS.textDim, fontSize: '11px', margin: 0 }}>
                      Adicione música de fundo, efeitos sonoros ou trilha.<br />
                      Formatos: MP3, WAV, OGG, AAC, M4A, FLAC
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {project.audioTracks.map((track, i) => (
                      <div key={track.id} style={{
                        background: COLORS.card, borderRadius: '8px', padding: '10px 12px',
                        border: `1px solid ${COLORS.border}`
                      }}>
                        {/* Nome e controles */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              background: `hsl(${i * 60 + 180}, 50%, 35%)`, color: '#fff',
                              borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 600
                            }}>
                              {track.type === 'music' ? '🎵' : track.type === 'sfx' ? '💥' : '🔊'}
                            </span>
                            <span style={{ color: COLORS.text, fontSize: '13px', fontWeight: 500 }}>
                              {track.originalName}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <select
                              value={track.type}
                              onChange={(e) => updateAudioTrack(track.id, 'type', e.target.value)}
                              style={{
                                padding: '2px 4px', borderRadius: '4px', border: `1px solid ${COLORS.border}`,
                                background: COLORS.bg, color: COLORS.text, fontSize: '10px'
                              }}
                            >
                              <option value="music">Música</option>
                              <option value="sfx">Efeito</option>
                              <option value="ambient">Ambiente</option>
                            </select>
                            <button
                              onClick={() => removeAudioTrack(track.id)}
                              style={{
                                background: 'none', border: 'none', color: COLORS.red,
                                cursor: 'pointer', fontSize: '14px', padding: '2px'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Player */}
                        <audio
                          controls
                          src={`${API_URL}/timeline/projects/${project.id}/files/${track.filename}`}
                          style={{ width: '100%', height: '28px', marginBottom: '6px' }}
                        />

                        {/* Volume slider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ color: COLORS.textDim, fontSize: '10px', width: '45px' }}>🔊 Vol:</span>
                          <input
                            type="range"
                            min="0" max="1" step="0.01"
                            value={track.volume}
                            onChange={(e) => updateAudioTrack(track.id, 'volume', parseFloat(e.target.value))}
                            style={{ flex: 1, accentColor: COLORS.accent }}
                          />
                          <span style={{ color: COLORS.text, fontSize: '10px', minWidth: '28px' }}>
                            {Math.round(track.volume * 100)}%
                          </span>
                        </div>

                        {/* Posição na timeline */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ color: COLORS.textDim, fontSize: '10px', width: '45px' }}>⏱ Início:</span>
                          <input
                            type="number"
                            value={track.startAt || 0}
                            onChange={(e) => updateAudioTrack(track.id, 'startAt', parseFloat(e.target.value) || 0)}
                            min={0}
                            step={0.5}
                            style={{
                              width: '60px', padding: '3px 5px', borderRadius: '4px',
                              border: `1px solid ${COLORS.border}`, background: COLORS.bg,
                              color: COLORS.text, fontSize: '11px', textAlign: 'center'
                            }}
                          />
                          <span style={{ color: COLORS.textDim, fontSize: '10px' }}>s</span>

                          <span style={{ color: COLORS.textDim, fontSize: '10px', marginLeft: '8px' }}>
                            Duração: {track.duration?.toFixed(1) || '?'}s
                          </span>
                        </div>

                        {/* Fade In/Out */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ color: COLORS.textDim, fontSize: '10px', width: '45px' }}>📈 Fade:</span>
                          <label style={{ color: COLORS.textDim, fontSize: '10px' }}>In</label>
                          <input
                            type="number"
                            value={track.fadeIn || 0}
                            onChange={(e) => updateAudioTrack(track.id, 'fadeIn', parseFloat(e.target.value) || 0)}
                            min={0} max={10} step={0.5}
                            style={{
                              width: '45px', padding: '3px', borderRadius: '4px',
                              border: `1px solid ${COLORS.border}`, background: COLORS.bg,
                              color: COLORS.text, fontSize: '10px', textAlign: 'center'
                            }}
                          />
                          <label style={{ color: COLORS.textDim, fontSize: '10px' }}>Out</label>
                          <input
                            type="number"
                            value={track.fadeOut || 0}
                            onChange={(e) => updateAudioTrack(track.id, 'fadeOut', parseFloat(e.target.value) || 0)}
                            min={0} max={10} step={0.5}
                            style={{
                              width: '45px', padding: '3px', borderRadius: '4px',
                              border: `1px solid ${COLORS.border}`, background: COLORS.bg,
                              color: COLORS.text, fontSize: '10px', textAlign: 'center'
                            }}
                          />
                          <span style={{ color: COLORS.textDim, fontSize: '10px' }}>s</span>
                        </div>

                        {/* Loop */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={track.loop || false}
                              onChange={(e) => updateAudioTrack(track.id, 'loop', e.target.checked)}
                              style={{ accentColor: COLORS.accent }}
                            />
                            <span style={{ color: COLORS.textDim, fontSize: '10px' }}>🔁 Loop (repetir até o fim do vídeo)</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* ── COLUNA DIREITA: Timeline ─────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: COLORS.bg }}>

          {/* ─ Clipes Grid ─ */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            {(!project?.clips || project.clips.length === 0) ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', minHeight: '300px'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📂</div>
                <p style={{ color: COLORS.textMuted, fontSize: '16px', margin: '0 0 8px' }}>
                  Nenhum clipe adicionado
                </p>
                <p style={{ color: COLORS.textDim, fontSize: '13px', margin: '0 0 20px', textAlign: 'center' }}>
                  Arraste vídeos ou clique em "Adicionar Clipes" para começar.<br />
                  Formatos: MP4, WebM, MOV, AVI, MKV
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '12px 32px', borderRadius: '8px', border: `2px dashed ${COLORS.accent}`,
                    background: 'transparent', color: COLORS.accent, cursor: 'pointer',
                    fontWeight: 600, fontSize: '14px'
                  }}
                >
                  📁 Selecionar Vídeos
                </button>
              </div>
            ) : (
              <>
                <h4 style={{ color: COLORS.textMuted, margin: '0 0 12px', fontSize: '13px', textTransform: 'uppercase' }}>
                  📋 Sequência de Clipes ({project.clips.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {project.clips.sort((a, b) => a.order - b.order).map((clip, index) => (
                    <div
                      key={clip.id}
                      draggable
                      onDragStart={() => handleDragStart(clip.id)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={() => { setDraggedClip(null); setDragOverIndex(null) }}
                      onClick={() => {
                        setSelectedClip(clip.id)
                        setPreviewClip(`${API_URL}/timeline/projects/${project.id}/files/${clip.filename}`)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 14px', borderRadius: '8px', cursor: 'grab',
                        background: selectedClip === clip.id ? COLORS.clipSelected : COLORS.card,
                        border: dragOverIndex === index
                          ? `2px solid ${COLORS.accent}`
                          : `1px solid ${selectedClip === clip.id ? COLORS.accent : COLORS.border}`,
                        transition: 'all 0.15s',
                        opacity: draggedClip === clip.id ? 0.5 : 1
                      }}
                    >
                      {/* Grip Handle */}
                      <span style={{ color: COLORS.textDim, cursor: 'grab', fontSize: '16px', userSelect: 'none' }}>⠿</span>

                      {/* Número */}
                      <span style={{
                        background: COLORS.accent, color: '#fff', borderRadius: '50%',
                        width: '24px', height: '24px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0
                      }}>
                        {index + 1}
                      </span>

                      {/* Thumbnail */}
                      <div style={{
                        width: '80px', height: '45px', borderRadius: '4px', overflow: 'hidden',
                        background: '#000', flexShrink: 0
                      }}>
                        {clip.thumbnail ? (
                          <img
                            src={`${API_URL}/timeline/projects/${project.id}/files/${clip.thumbnail}`}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '100%', height: '100%', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: COLORS.textDim,
                            fontSize: '20px'
                          }}>🎬</div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: COLORS.text, fontSize: '13px', fontWeight: 500,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {clip.originalName}
                        </div>
                        <div style={{ color: COLORS.textDim, fontSize: '11px', marginTop: '2px' }}>
                          {formatTime(clip.trimEnd - clip.trimStart)} • {clip.width}×{clip.height}
                        </div>
                      </div>

                      {/* Trim controls (quando selecionado) */}
                      {selectedClip === clip.id && (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ color: COLORS.textDim, fontSize: '9px' }}>INÍCIO</label>
                            <input
                              type="number"
                              value={clip.trimStart.toFixed(1)}
                              onChange={(e) => updateTrim(clip.id, 'trimStart', e.target.value)}
                              min={0}
                              max={clip.duration}
                              step={0.1}
                              style={{
                                width: '52px', padding: '3px 5px', borderRadius: '4px',
                                border: `1px solid ${COLORS.border}`, background: COLORS.bg,
                                color: COLORS.text, fontSize: '11px', textAlign: 'center'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ color: COLORS.textDim, fontSize: '9px' }}>FIM</label>
                            <input
                              type="number"
                              value={clip.trimEnd.toFixed(1)}
                              onChange={(e) => updateTrim(clip.id, 'trimEnd', e.target.value)}
                              min={0}
                              max={clip.duration}
                              step={0.1}
                              style={{
                                width: '52px', padding: '3px 5px', borderRadius: '4px',
                                border: `1px solid ${COLORS.border}`, background: COLORS.bg,
                                color: COLORS.text, fontSize: '11px', textAlign: 'center'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                      )}

                      {/* Botão remover */}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeClip(clip.id) }}
                        style={{
                          background: 'none', border: 'none', color: COLORS.red,
                          cursor: 'pointer', fontSize: '16px', padding: '4px', flexShrink: 0
                        }}
                        title="Remover clipe"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Botão adicionar mais */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px', marginTop: '12px',
                    border: `2px dashed ${COLORS.border}`, background: 'transparent',
                    color: COLORS.textDim, cursor: 'pointer', fontSize: '13px'
                  }}
                >
                  ➕ Adicionar mais clipes
                </button>
              </>
            )}
          </div>

          {/* ── TIMELINE VISUAL (barra inferior) ── */}
          {project?.clips?.length > 0 && (
            <div style={{
              borderTop: `1px solid ${COLORS.border}`, background: COLORS.timeline,
              padding: '12px 16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ color: COLORS.textDim, fontSize: '11px' }}>⏱ TIMELINE</span>
                <span style={{ color: COLORS.text, fontSize: '12px', fontWeight: 600 }}>
                  {formatTime(totalDuration)}
                </span>
              </div>

              <div style={{
                display: 'flex', gap: '2px', height: '40px', borderRadius: '6px', overflow: 'hidden'
              }}>
                {project.clips.sort((a, b) => a.order - b.order).map((clip, i) => {
                  const clipSpeed = clip.speed || 1
                  const clipDur = (clip.trimEnd - clip.trimStart) / clipSpeed
                  const widthPercent = totalDuration > 0 ? (clipDur / totalDuration) * 100 : 100 / project.clips.length

                  // Cores alternadas para diferenciar clipes
                  const hue = (i * 40 + 260) % 360

                  return (
                    <div
                      key={clip.id}
                      onClick={() => {
                        setSelectedClip(clip.id)
                        setPreviewClip(`${API_URL}/timeline/projects/${project.id}/files/${clip.filename}`)
                      }}
                      style={{
                        width: `${widthPercent}%`,
                        height: '100%',
                        background: selectedClip === clip.id
                          ? `hsl(${hue}, 70%, 45%)`
                          : `hsl(${hue}, 50%, 30%)`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s',
                        position: 'relative',
                        minWidth: '20px'
                      }}
                      title={`${clip.originalName} (${formatTime(clipDur)})`}
                    >
                      <span style={{
                        color: '#fff', fontSize: '10px', fontWeight: 600,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        padding: '0 4px'
                      }}>
                        {widthPercent > 8 ? `${i + 1}` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Marcadores de tempo */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ color: COLORS.textDim, fontSize: '10px' }}>0:00</span>
                <span style={{ color: COLORS.textDim, fontSize: '10px' }}>{formatTime(totalDuration / 2)}</span>
                <span style={{ color: COLORS.textDim, fontSize: '10px' }}>{formatTime(totalDuration)}</span>
              </div>
            </div>
          )}

          {/* ── Output (vídeo pronto) ─────── */}
          {project?.status === 'done' && project?.outputFile && (
            <div style={{
              borderTop: `1px solid ${COLORS.border}`, background: COLORS.card,
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <span style={{ color: COLORS.green, fontSize: '20px' }}>✅</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: COLORS.text, fontSize: '14px', fontWeight: 600 }}>Vídeo Pronto!</div>
                <div style={{ color: COLORS.textDim, fontSize: '12px' }}>Clique para baixar ou assistir</div>
              </div>
              <a
                href={`${API_URL}/timeline/projects/${project.id}/output`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 16px', borderRadius: '6px', background: COLORS.green,
                  color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '13px'
                }}
              >
                ⬇️ Download
              </a>
              <button
                onClick={() => setPreviewClip(`${API_URL}/timeline/projects/${project.id}/output`)}
                style={{
                  padding: '8px 16px', borderRadius: '6px', background: COLORS.accent,
                  color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
                }}
              >
                ▶️ Assistir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
