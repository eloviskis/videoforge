import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import DocsTab from './DocsTab.jsx'
import TimelineEditor from './TimelineEditor.jsx'

// VITE_API_URL: configure no Vercel apontando para o backend no Railway
// Em dev usa localhost:3001, em produção sem VITE_API_URL usa mesma origin
const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : (window.location.port === '3000'
    ? 'http://localhost:3001/api'
    : `${window.location.origin}/api`)

function App() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('videos')
  const [config, setConfig] = useState({
    gemini_configured: false,
    pexels_configured: false,
    youtube_configured: false,
    youtube_connected: false,
    social: {}
  })
  const [showConfig, setShowConfig] = useState(false)
  const [shareLinks, setShareLinks] = useState({})
  const [formData, setFormData] = useState({
    titulo: '',
    nicho: 'curiosidades',
    duracao: 10,
    detalhes: '',
    publicarYoutube: false,
    legendas: true,
    estiloLegenda: 'classic',
    tipoVideo: 'stickAnimation' // 'stockImages' ou 'stickAnimation'
  })

  // === NEWS STATE ===
  const [newsSources, setNewsSources] = useState([])
  const [newsItems, setNewsItems] = useState([])
  const [newsVideos, setNewsVideos] = useState([])
  const [newsConfig, setNewsConfig] = useState({})
  const [newsLoading, setNewsLoading] = useState(false)
  const [collectLoading, setCollectLoading] = useState(false)
  const [newSourceForm, setNewSourceForm] = useState({ nome: '', url: '', categoria: 'geral' })
  const [apiKeys, setApiKeys] = useState([])
  const [editingKey, setEditingKey] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [youtubeChannels, setYoutubeChannels] = useState([])
  const [youtubeSelectedChannel, setYoutubeSelectedChannel] = useState(null)
  const [showPaidModal, setShowPaidModal] = useState(false)
  const [paidModalInfo, setPaidModalInfo] = useState(null)
  const [restartingBackend, setRestartingBackend] = useState(false)
  const [modoRoteiro, setModoRoteiro] = useState('ia') // 'ia' | 'manual'
  const [roteiroManual, setRoteiroManual] = useState({ titulo: '', tipoVideo: 'stickAnimation', publicarYoutube: false, texto: '' })
  const [editorCenas, setEditorCenas] = useState({})

  // === REVIEW STATE ===
  const [reviewForm, setReviewForm] = useState({
    nomeProduto: '',
    categoria: 'tecnologia',
    linkProduto: '',
    pontosPositivos: '',
    pontosNegativos: '',
    notaGeral: '8',
    publicoAlvo: '',
    faixaPreco: '',
    tipoVideo: 'stockImages',
    legendas: true,
    estiloLegenda: 'classic',
    publicarYoutube: false,
    duracao: 8
  })
  const [reviewLoading, setReviewLoading] = useState(false) // { videoId: { cenas: [], loading: false, open: false } }
  const [monitorVideoId, setMonitorVideoId] = useState(null)
  const [monitorVideo, setMonitorVideo] = useState(null)
  const [monitorMinimized, setMonitorMinimized] = useState(false)
  const monitorEndRef = useRef(null)

  // === CORTES STATE ===
  const [corteUrl, setCorteUrl] = useState('')
  const [corteIsOwn, setCorteIsOwn] = useState(false)
  const [corteJob, setCorteJob] = useState(null)
  const [corteFormats, setCorteFormats] = useState({ short: true, horizontal: true, compilation: false })
  const [corteSelectedSegs, setCorteSelectedSegs] = useState([])
  const [corteAnalyzing, setCorteAnalyzing] = useState(false)
  const [corteCutting, setCorteCutting] = useState(false)
  const [cortePublishing, setCortePublishing] = useState(null) // clipFile sendo publicado
  const [corteTitulos, setCorteTitulos] = useState({}) // { clipFile: titulo }
  const [corteDescricoes, setCorteDescricoes] = useState({}) // { clipFile: descricao }
  const [tiktokConectado, setTiktokConectado] = useState(false)

  // Tipos pagos com informação de custo
  // numCenas = Math.max(8, Math.ceil(duracao * 60 / 20)) — mesma fórmula do backend
  const calcNumCenas = (duracao) => Math.max(8, Math.ceil(Number(duracao) * 60 / 20))
  const USD_BRL = 5.80 // cotação aproximada
  const brl = (usd) => (usd * USD_BRL).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const PAID_TYPES = {
    replicateGeneration: {
      label: 'Replicate / Wan 2.1',
      icon: '🤖',
      warning: 'O Replicate requer créditos. Adicione forma de pagamento em replicate.com/account/billing.',
      calcCost: (duracao) => {
        const n = calcNumCenas(duracao)
        return {
          total: `${brl(n * 0.005)} – ${brl(n * 0.02)}`,
          detalhe: `${n} cenas × ~R$0,03–R$0,12 por geração`,
        }
      },
    },
    klingGeneration: {
      label: 'Kling AI',
      icon: '🎥',
      warning: 'Kling AI requer KLING_ACCESS_KEY_ID e KLING_ACCESS_KEY_SECRET no .env. Crie suas chaves em: platform.klingai.com/account/developer',
      calcCost: (duracao) => {
        const n = calcNumCenas(duracao)
        // Kling v1-6 std: ~0.14 kréditos por segundo, 1 crédito = ~$0.014
        // 5s de vídeo ≈ 0.7 créditos = ~$0.01 por cena
        return {
          total: `${brl(n * 0.01)} – ${brl(n * 0.04)}`,
          detalhe: `${n} cenas × 5s × ~${brl(0.02)}–${brl(0.04)} (modo std/pro)`,
        }
      },
    },
    huggingfaceGeneration: {
      label: 'Hugging Face',
      icon: '🧠',
      warning: 'A API de vídeo do Hugging Face agora requer créditos pré-pagos na sua conta.',
      calcCost: (duracao) => {
        const n = calcNumCenas(duracao)
        return {
          total: `${brl(n * 0.01)} – ${brl(n * 0.05)}`,
          detalhe: `${n} cenas × ~R$0,06–R$0,29 por geração`,
        }
      },
    },
    veoGeneration: {
      label: 'Veo 3 (Google Vertex)',
      icon: '🎬',
      warning: 'Este serviço usa Google Cloud billing e cobra por segundo de vídeo gerado.',
      calcCost: (duracao) => {
        const n = calcNumCenas(duracao)
        const totalSeg = n * 8
        return {
          total: brl(totalSeg * 0.35),
          detalhe: `${n} cenas × 8s × ${brl(0.35)}/segundo`,
        }
      },
    },
    soraGeneration: {
      label: 'Sora (OpenAI)',
      icon: '🌟',
      warning: 'Este serviço requer assinatura ativa da OpenAI (ChatGPT Plus/Pro).',
      calcCost: (duracao) => {
        const n = calcNumCenas(duracao)
        return {
          total: 'Varia (assinatura)',
          detalhe: `${n} cenas geradas via API da OpenAI`,
        }
      },
    },
    didAvatar: {
      label: 'D-ID Avatar Apresentador',
      icon: '🎭',
      warning: 'D-ID requer DID_API_KEY e DID_PRESENTER_URL configuradas. Crie sua conta em studio.d-id.com.',
      calcCost: (duracao) => {
        return {
          total: `~${brl(5.9)}/mês`,
          detalhe: `Apresentador de avatar lê a narração gerada (voz + rosto animado)`,
        }
      },
    },
  }

  useEffect(() => {
    carregarVideos()
    carregarConfig()
    carregarApiKeys()
    axios.get(`${API_URL}/social/tiktok/status`).then(r => setTiktokConectado(r.data.connected)).catch(() => {})
    const interval = setInterval(() => {
      carregarVideos()
      carregarConfig()
      if (activeTab === 'news') {
        carregarNewsVideos()
      }
    }, 3000)
    // Polling do job de CORTES ativo
    const corteInterval = setInterval(async () => {
      if (corteJob && !['analisado', 'pronto', 'erro', 'erro_corte'].includes(corteJob.status)) {
        try {
          const { data } = await axios.get(`${API_URL}/cortes/jobs/${corteJob.id}`)
          setCorteJob(data)
        } catch {}
      }
      if (corteJob && corteJob.status === 'pronto') {
        try {
          const { data } = await axios.get(`${API_URL}/cortes/jobs/${corteJob.id}`)
          setCorteJob(data)
        } catch {}
      }
    }, 2000)
    return () => { clearInterval(interval); clearInterval(corteInterval) }
  }, [activeTab, corteJob])

  // Polling específico para o vídeo monitorado (1s)
  useEffect(() => {
    if (!monitorVideoId) return
    const t = setInterval(async () => {
      try {
        const r = await axios.get(`${API_URL}/videos/${monitorVideoId}`)
        setMonitorVideo(r.data)
        if (['pronto', 'concluido', 'publicado', 'erro'].includes(r.data.status)) {
          clearInterval(t)
        }
      } catch {}
    }, 1000)
    return () => clearInterval(t)
  }, [monitorVideoId])

  // Scroll automático para última etapa
  useEffect(() => {
    if (monitorEndRef.current) {
      monitorEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [monitorVideo?.logEtapas?.length])

  // Carregar dados de notícias quando a aba mudar
  useEffect(() => {
    if (activeTab === 'news') {
      carregarNewsSources()
      carregarNewsItems()
      carregarNewsVideos()
      carregarNewsConfig()
    }
  }, [activeTab])

  const carregarConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/config`)
      setConfig(response.data)
      // Carregar status do YouTube com canais
      try {
        const ytStatus = await axios.get(`${API_URL}/youtube/status`)
        if (ytStatus.data.channels) setYoutubeChannels(ytStatus.data.channels)
        if (ytStatus.data.selectedChannel) setYoutubeSelectedChannel(ytStatus.data.selectedChannel)
      } catch (e) {}
    } catch (error) {
      console.error('Erro ao carregar config:', error)
    }
  }

  const carregarApiKeys = async () => {
    try {
      const response = await axios.get(`${API_URL}/config/keys`)
      setApiKeys(response.data)
    } catch (error) {
      console.error('Erro ao carregar chaves de API:', error)
    }
  }

  const salvarApiKey = async (key, value) => {
    try {
      await axios.put(`${API_URL}/config/keys`, { key, value })
      setEditingKey(null)
      setEditValue('')
      await carregarApiKeys()
      await carregarConfig()
      alert('✅ Chave salva com sucesso! Reinicie o servidor para efeito total.')
    } catch (error) {
      alert('❌ Erro ao salvar: ' + (error.response?.data?.error || error.message))
    }
  }

  const apagarApiKey = async (key, label) => {
    if (!confirm(`Tem certeza que deseja apagar a chave "${label}"?`)) return
    try {
      await axios.delete(`${API_URL}/config/keys/${key}`)
      await carregarApiKeys()
      await carregarConfig()
      alert('🗑️ Chave removida com sucesso!')
    } catch (error) {
      alert('❌ Erro ao apagar: ' + (error.response?.data?.error || error.message))
    }
  }

  const reiniciarBackend = async () => {
    if (!confirm('Tem certeza que deseja reiniciar o backend? O sistema ficará fora por ~3 segundos.')) return
    setRestartingBackend(true)
    try {
      await axios.post(`${API_URL}/admin/restart`)
      alert('✅ Backend reiniciando... Aguarde 5 segundos e recarregue a página.')
      setTimeout(() => { setRestartingBackend(false); window.location.reload() }, 5000)
    } catch (error) {
      setRestartingBackend(false)
      alert('❌ Erro ao reiniciar: ' + (error.response?.data?.error || error.message))
    }
  }

  const carregarVideos = async () => {
    try {
      const response = await axios.get(`${API_URL}/videos`)
      setVideos(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Erro ao carregar vídeos:', error)
      setVideos([])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.titulo.trim()) {
      alert('Por favor, descreva o vídeo que deseja criar')
      return
    }

    if (!config.gemini_configured) {
      alert('⚠️ Configure a API do Gemini antes de criar vídeos!\nVá em Configurações.')
      return
    }

    // Verificar se é um tipo pago — mostrar modal de confirmação
    const paidInfo = PAID_TYPES[formData.tipoVideo]
    if (paidInfo) {
      const costInfo = paidInfo.calcCost(formData.duracao)
      setPaidModalInfo({ ...paidInfo, costInfo, duracao: formData.duracao })
      setShowPaidModal(true)
      return
    }

    await enviarVideo()
  }

  const enviarVideo = async () => {
    setShowPaidModal(false)
    setPaidModalInfo(null)
    setLoading(true)
    
    try {
      const response = await axios.post(`${API_URL}/videos`, formData)
      
      setFormData({
        titulo: '',
        nicho: 'curiosidades',
        duracao: 10,
        detalhes: '',
        publicarYoutube: false,
        legendas: true,
        estiloLegenda: 'classic',
        tipoVideo: 'stickAnimation'
      })
      
      await carregarVideos()
      setMonitorVideoId(response.data.videoId)
      setMonitorMinimized(false)
      setMonitorVideo(null)
      alert(`✅ ${response.data.message}`)
    } catch (error) {
      console.error('Erro ao criar vídeo:', error)
      alert('❌ Erro ao criar vídeo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({
      ...formData,
      [e.target.name]: value
    })
  }

  const toggleEditorCenas = async (videoId) => {
    const estado = editorCenas[videoId]
    if (estado?.open) {
      setEditorCenas(prev => ({ ...prev, [videoId]: { ...prev[videoId], open: false } }))
      return
    }
    setEditorCenas(prev => ({ ...prev, [videoId]: { cenas: [], loading: true, open: true } }))
    try {
      const r = await axios.get(`${API_URL}/videos/${videoId}/cenas`)
      setEditorCenas(prev => ({ ...prev, [videoId]: { cenas: r.data.cenas, loading: false, open: true } }))
    } catch {
      setEditorCenas(prev => ({ ...prev, [videoId]: { cenas: [], loading: false, open: true, error: 'Não foi possível carregar cenas' } }))
    }
  }

  const trocarMidiaCena = async (videoId, numCena, novaUrl, tipo) => {
    try {
      await axios.put(`${API_URL}/videos/${videoId}/cenas/${numCena}/media`, { url: novaUrl, tipo: tipo || 'imagem' })
      const r = await axios.get(`${API_URL}/videos/${videoId}/cenas`)
      setEditorCenas(prev => ({ ...prev, [videoId]: { ...prev[videoId], cenas: r.data.cenas } }))
    } catch (err) {
      alert('Erro ao trocar mídia: ' + (err.response?.data?.error || err.message))
    }
  }

  const conectarYoutube = async () => {
    try {
      const response = await axios.get(`${API_URL}/youtube/auth`)
      const popup = window.open(response.data.authUrl, '_blank', 'width=600,height=700')
      // Polling para detectar quando o popup fecha (callback completou)
      const checkClosed = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(checkClosed)
          await carregarConfig()
        }
      }, 1500)
    } catch (error) {
      alert('Erro ao conectar YouTube: ' + error.message)
    }
  }

  const selecionarCanal = async (channelId) => {
    try {
      const resp = await axios.post(`${API_URL}/youtube/select-channel`, { channelId })
      setYoutubeSelectedChannel(resp.data.selectedChannel)
    } catch (error) {
      alert('Erro ao selecionar canal: ' + (error.response?.data?.error || error.message))
    }
  }

  const desconectarYoutube = async () => {
    try {
      await axios.post(`${API_URL}/youtube/disconnect`)
      setYoutubeChannels([])
      setYoutubeSelectedChannel(null)
      await carregarConfig()
    } catch (error) {
      console.error('Erro ao desconectar YouTube:', error)
    }
  }

  const conectarRedeSocial = async (network) => {
    try {
      const response = await axios.get(`${API_URL}/social/${network}/auth`)
      window.open(response.data.authUrl, '_blank', 'width=600,height=700')
    } catch (error) {
      alert(`Erro ao conectar ${network}: ` + (error.response?.data?.error || error.message))
    }
  }

  const desconectarRedeSocial = async (network) => {
    try {
      await axios.post(`${API_URL}/social/${network}/disconnect`)
      await carregarConfig()
    } catch (error) {
      alert(`Erro ao desconectar ${network}: ` + error.message)
    }
  }

  const carregarShareLinks = async (videoId) => {
    try {
      const response = await axios.get(`${API_URL}/videos/${videoId}/share-links`)
      setShareLinks(prev => ({ ...prev, [videoId]: response.data }))
    } catch (error) {
      console.error('Erro ao carregar links:', error)
    }
  }

  const compartilharManual = async (videoId) => {
    try {
      const response = await axios.post(`${API_URL}/videos/${videoId}/share`)
      if (response.data.compartilhamentos?.length > 0) {
        const ok = response.data.compartilhamentos.filter(c => c.sucesso).map(c => c.rede)
        const fail = response.data.compartilhamentos.filter(c => !c.sucesso).map(c => c.rede)
        let msg = ''
        if (ok.length) msg += `✅ Compartilhado em: ${ok.join(', ')}\n`
        if (fail.length) msg += `❌ Falhou em: ${fail.join(', ')}`
        alert(msg)
      } else {
        alert('Nenhuma rede social conectada para compartilhar.')
      }
    } catch (error) {
      alert('Erro ao compartilhar: ' + error.message)
    }
  }

  const getStatusClass = (status) => {
    return `video-status status-${status}`
  }

  const getStatusEmoji = (status) => {
    const emojis = {
      iniciando: '🔵',
      gerando_roteiro: '🤖',
      gerando_narracao: '🎙️',
      buscando_visuais: '🖼️',
      renderizando: '🎬',
      publicando: '📺',
      concluido: '✅',
      publicado: '🎉',
      erro: '❌'
    }
    return emojis[status] || '⚙️'
  }

  // ==========================================
  // NEWS FUNCTIONS
  // ==========================================
  const carregarNewsSources = async () => {
    try {
      const r = await axios.get(`${API_URL}/news/sources`)
      setNewsSources(Array.isArray(r.data) ? r.data : [])
    } catch (e) { console.error('Erro news sources:', e) }
  }

  const carregarNewsItems = async () => {
    try {
      const r = await axios.get(`${API_URL}/news/items`)
      setNewsItems(Array.isArray(r.data) ? r.data : [])
    } catch (e) { console.error('Erro news items:', e) }
  }

  const carregarNewsVideos = async () => {
    try {
      const r = await axios.get(`${API_URL}/news/videos`)
      setNewsVideos(Array.isArray(r.data) ? r.data : [])
    } catch (e) { console.error('Erro news videos:', e) }
  }

  const carregarNewsConfig = async () => {
    try {
      const r = await axios.get(`${API_URL}/news/config`)
      setNewsConfig(r.data || {})
    } catch (e) { console.error('Erro news config:', e) }
  }

  const coletarNoticiasAgora = async () => {
    setCollectLoading(true)
    try {
      const r = await axios.post(`${API_URL}/news/collect`)
      alert(`✅ ${r.data.coletadas} notícias coletadas de ${r.data.fontes} fontes!`)
      await carregarNewsItems()
    } catch (e) {
      alert('❌ Erro ao coletar: ' + (e.response?.data?.error || e.message))
    } finally {
      setCollectLoading(false)
    }
  }

  const gerarVideoNoticias = async () => {
    if (!config.gemini_configured) {
      alert('⚠️ Configure a API do Gemini antes de gerar vídeos!')
      return
    }
    setNewsLoading(true)
    try {
      const r = await axios.post(`${API_URL}/news/videos`, {
        tom: newsConfig.tom || 'casual',
        max_noticias: newsConfig.max_noticias || 8,
        threshold_minimo: newsConfig.threshold_minimo || 3,
        publicarYoutube: newsConfig.publicar_youtube || false,
      })
      alert(`✅ Vídeo de notícias "${r.data.titulo}" em produção!`)
      await carregarNewsVideos()
    } catch (e) {
      alert('❌ Erro: ' + (e.response?.data?.error || e.message))
    } finally {
      setNewsLoading(false)
    }
  }

  const adicionarFonte = async (e) => {
    e.preventDefault()
    if (!newSourceForm.nome || !newSourceForm.url) return
    try {
      await axios.post(`${API_URL}/news/sources`, newSourceForm)
      setNewSourceForm({ nome: '', url: '', categoria: 'geral' })
      await carregarNewsSources()
    } catch (e) {
      alert('❌ Erro: ' + (e.response?.data?.error || e.message))
    }
  }

  const toggleFonte = async (id, ativo) => {
    try {
      await axios.patch(`${API_URL}/news/sources/${id}`, { ativo: !ativo })
      await carregarNewsSources()
    } catch (e) { alert('Erro: ' + e.message) }
  }

  const deletarFonteUI = async (id) => {
    if (!confirm('Remover esta fonte RSS?')) return
    try {
      await axios.delete(`${API_URL}/news/sources/${id}`)
      await carregarNewsSources()
    } catch (e) { alert('Erro: ' + e.message) }
  }

  const salvarNewsConfig = async (campo, valor) => {
    try {
      const updated = { ...newsConfig, [campo]: valor }
      setNewsConfig(updated)
      await axios.patch(`${API_URL}/news/config`, { [campo]: valor })
    } catch (e) { alert('Erro: ' + e.message) }
  }

  const getNewsStatusEmoji = (status) => {
    const m = {
      COLETANDO: '📡', SELECIONANDO: '🔍', ROTEIRO_GERADO: '📝',
      NARRACAO_PRONTA: '🎙️', RENDERIZANDO: '🎬', RENDERIZADO: '✅',
      PUBLICADO: '🎉', ERRO: '❌', SEM_NOTICIAS: '⚠️'
    }
    return m[status] || '⚙️'
  }

  return (
    <>
    <div className="container">
      <div className="header">
        <h1>🎬 VideoForge</h1>
        <p>Crie vídeos automaticamente com IA e publique no YouTube</p>
        <button 
          onClick={() => setShowConfig(!showConfig)}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          ⚙️ Configurações
        </button>
        <div className="tabs-nav">
          <button className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`} onClick={() => setActiveTab('videos')}>
            🎬 Vídeos
          </button>
          <button className={`tab-btn ${activeTab === 'news' ? 'active' : ''}`} onClick={() => setActiveTab('news')}>
            📰 Notícias
          </button>
          <button className={`tab-btn ${activeTab === 'cortes' ? 'active' : ''}`} onClick={() => setActiveTab('cortes')}>
            ✂️ Cortes
          </button>
          <button className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>
            ⭐ Reviews
          </button>
          <button className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>
            🎥 Timeline
          </button>
          <button className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`} onClick={() => setActiveTab('docs')}>
            📚 Tutoriais
          </button>
        </div>
      </div>

      {/* Painel de Configurações */}
      {showConfig && (
        <div className="main-card" style={{ marginBottom: '20px' }}>
          <h2>⚙️ Configurações</h2>
          
          {/* Chaves de API - Gerenciamento Completo */}
          {['apis', 'youtube', 'social'].map(group => {
            const groupLabels = { apis: '🔑 APIs Principais', youtube: '📺 YouTube', social: '📱 Redes Sociais' }
            const groupKeys = apiKeys.filter(k => k.group === group)
            if (groupKeys.length === 0) return null
            return (
              <div key={group} style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>{groupLabels[group]}</h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {groupKeys.map(apiKey => (
                    <div key={apiKey.key} style={{
                      padding: '12px 16px',
                      background: apiKey.configured ? '#f0fdf4' : '#f5f5f5',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${apiKey.configured ? '#22c55e' : '#d1d5db'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{apiKey.configured ? '✅' : '❌'}</span>
                            <strong style={{ fontSize: '14px' }}>{apiKey.label}</strong>
                            {apiKey.freeLabel && (
                              <span style={{
                                fontSize: '10px', fontWeight: 'bold', padding: '1px 7px', borderRadius: '10px',
                                background: apiKey.free ? '#dcfce7' : '#fef9c3',
                                color: apiKey.free ? '#166534' : '#92400e',
                                border: `1px solid ${apiKey.free ? '#86efac' : '#fde68a'}`
                              }}>{apiKey.free ? '🟢 ' : '🟡 '}{apiKey.freeLabel}</span>
                            )}
                            {apiKey.required && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 'bold' }}>OBRIGATÓRIO</span>}
                          </div>
                          <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0 0', fontFamily: 'monospace' }}>
                            {apiKey.key}: {apiKey.configured ? apiKey.maskedValue : '(vazio)'}
                          </p>
                          {apiKey.hint && !apiKey.configured && (
                            <p style={{ fontSize: '11px', color: '#3b82f6', margin: '2px 0 0 0' }}>
                              🔗 Cadastro: <a href={apiKey.hint} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>{apiKey.hint}</a>
                            </p>
                          )}
                        </div>
                        
                        {/* Botões Editar / Apagar */}
                        {editingKey !== apiKey.key && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => { setEditingKey(apiKey.key); setEditValue(''); }}
                              style={{
                                padding: '5px 12px',
                                fontSize: '12px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              ✏️ Editar
                            </button>
                            {apiKey.configured && (
                              <button
                                onClick={() => apagarApiKey(apiKey.key, apiKey.label)}
                                style={{
                                  padding: '5px 12px',
                                  fontSize: '12px',
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                🗑️ Apagar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Campo de Edição Inline */}
                      {editingKey === apiKey.key && (
                        <div style={{ marginTop: '10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder={`Cole aqui a nova chave para ${apiKey.label}...`}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              fontSize: '13px',
                              border: '2px solid #3b82f6',
                              borderRadius: '6px',
                              fontFamily: 'monospace',
                              outline: 'none'
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => salvarApiKey(apiKey.key, editValue)}
                            style={{
                              padding: '8px 16px',
                              fontSize: '12px',
                              background: '#22c55e',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            💾 Salvar
                          </button>
                          <button
                            onClick={() => { setEditingKey(null); setEditValue(''); }}
                            style={{
                              padding: '8px 12px',
                              fontSize: '12px',
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            ✖
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Botão Reiniciar Backend (admin) */}
          <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#fef3c7', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <strong>🔄 Reiniciar Backend</strong>
                <p style={{ fontSize: '12px', color: '#78716c', margin: '4px 0 0' }}>
                  Use após modificar chaves de API para aplicar as mudanças
                </p>
              </div>
              <button
                onClick={reiniciarBackend}
                disabled={restartingBackend}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  background: restartingBackend ? '#9ca3af' : '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: restartingBackend ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {restartingBackend ? '⏳ Reiniciando...' : '🔄 Reiniciar'}
              </button>
            </div>
          </div>

          {/* YouTube - Conexão e Canal */}
          {config.youtube_configured && (
            <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #FF0000' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>▶️</span>
                <strong>Conexão YouTube</strong>
                <span style={{ fontSize: '12px', color: config.youtube_connected ? '#22c55e' : '#f59e0b' }}>
                  {config.youtube_connected ? '● Conectado' : '● Desconectado'}
                </span>
              </div>
              
              {!config.youtube_connected && (
                <button onClick={conectarYoutube} className="social-connect-btn" style={{ background: '#FF0000' }}>
                  ▶️ Conectar YouTube
                </button>
              )}
              
              {config.youtube_connected && youtubeChannels.length > 0 && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    📺 Canal para publicação:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {youtubeChannels.map(ch => (
                      <div 
                        key={ch.id}
                        onClick={() => selecionarCanal(ch.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                          border: youtubeSelectedChannel?.id === ch.id ? '2px solid #FF0000' : '2px solid #ddd',
                          background: youtubeSelectedChannel?.id === ch.id ? '#fff5f5' : '#fff',
                          transition: 'all 0.2s'
                        }}
                      >
                        {ch.thumbnail && <img src={ch.thumbnail} alt={ch.title} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ch.title}{youtubeSelectedChannel?.id === ch.id && ' ✅'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#888' }}>
                            {ch.customUrl && `${ch.customUrl} · `}{Number(ch.subscriberCount).toLocaleString()} inscritos · {ch.videoCount} vídeos
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {config.youtube_connected && (
                <button onClick={desconectarYoutube} style={{ marginTop: '8px', padding: '4px 12px', fontSize: '11px', background: 'transparent', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', color: '#888' }}>
                  🔌 Desconectar
                </button>
              )}
            </div>
          )}

          {/* Redes Sociais - Info */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '5px' }}>📤 Compartilhamento nas Redes Sociais</h3>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
              Quando seu vídeo for publicado, use os botões de compartilhamento rápido para postar diretamente nas suas redes sociais favoritas.
            </p>
            <div style={{ display: 'grid', gap: '8px' }}>
              {[
                { icon: '🐦', name: 'X (Twitter)', desc: 'Posta automaticamente com título + link do YouTube', color: '#000' },
                { icon: '📘', name: 'Facebook', desc: 'Compartilha o link do vídeo no seu perfil', color: '#1877F2' },
                { icon: '📸', name: 'Instagram', desc: 'Abre o Instagram para você fazer upload do vídeo', color: '#E1306C' },
                { icon: '🎵', name: 'TikTok', desc: 'Abre o TikTok para você fazer upload do vídeo', color: '#000' },
                { icon: '💼', name: 'LinkedIn', desc: 'Compartilha o link no seu perfil profissional', color: '#0A66C2' },
                { icon: '💬', name: 'WhatsApp', desc: 'Envia título + link para contatos ou grupos', color: '#25D366' },
                { icon: '✈️', name: 'Telegram', desc: 'Compartilha título + link em chats ou canais', color: '#0088CC' },
                { icon: '🔴', name: 'Reddit', desc: 'Posta o link em qualquer subreddit', color: '#FF4500' },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: '8px', background: '#f5f5f5',
                  borderLeft: `4px solid ${s.color}`, display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <span style={{ fontSize: '20px' }}>{s.icon}</span>
                  <div>
                    <strong style={{ fontSize: '13px' }}>{s.name}</strong>
                    <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: '#aaa', marginTop: '10px', fontStyle: 'italic' }}>
              💡 Os botões de compartilhamento aparecem no card de cada vídeo publicado. Basta clicar e a rede social abre em uma nova aba!
            </p>
          </div>

          {/* Dicas */}
          <div style={{ padding: '15px', background: '#fef3c7', borderRadius: '8px', marginBottom: '15px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>💡 Dica</h4>
            <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.5' }}>
              Use os botões <strong>✏️ Editar</strong> e <strong>🗑️ Apagar</strong> para gerenciar cada chave de API diretamente pela interface.
              Alterações são salvas no arquivo <code>.env</code> do backend.
            </p>
          </div>
        </div>
      )}

      {/* Formulário de criação */}
      {activeTab === 'videos' && (
      <div className="main-card">
        <h2>✨ Criar Novo Vídeo</h2>

        {/* Toggle modo */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#f0f0f0', borderRadius: '10px', padding: '4px' }}>
          <button type="button" onClick={() => setModoRoteiro('ia')} style={{
            flex: 1, padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.88em',
            background: modoRoteiro === 'ia' ? '#8b5cf6' : 'transparent',
            color: modoRoteiro === 'ia' ? '#fff' : '#555', transition: 'all 0.2s'
          }}>🤖 IA cria o roteiro</button>
          <button type="button" onClick={() => setModoRoteiro('manual')} style={{
            flex: 1, padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.88em',
            background: modoRoteiro === 'manual' ? '#8b5cf6' : 'transparent',
            color: modoRoteiro === 'manual' ? '#fff' : '#555', transition: 'all 0.2s'
          }}>✏️ Tenho meu roteiro</button>
        </div>

        {/* Modo Manual */}
        {modoRoteiro === 'manual' && (
          <form onSubmit={async (e) => {
            e.preventDefault()
            if (!roteiroManual.titulo.trim()) { alert('Informe o título do vídeo'); return }
            if (!roteiroManual.texto.trim()) { alert('Cole o roteiro abaixo'); return }
            setLoading(true)
            try {
              const r = await axios.post(`${API_URL}/videos/manual`, roteiroManual)
              await carregarVideos()
              setMonitorVideoId(r.data.videoId)
              setMonitorMinimized(false)
              setMonitorVideo(null)
              alert(`✅ Vídeo iniciado! Acompanhe o progresso no painel lateral.`)
            } catch (err) {
              alert('❌ Erro: ' + (err.response?.data?.error || err.message))
            } finally {
              setLoading(false)
            }
          }}>
            <div className="form-group">
              <label>Título do vídeo</label>
              <input
                type="text"
                value={roteiroManual.titulo}
                onChange={e => setRoteiroManual(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Ex: A Jornada do Palitinho Astronauta"
                required
              />
            </div>

            <div className="form-group">
              <label>Tipo de Vídeo</label>
              {(() => {
                const titulo = (roteiroManual.titulo || '').toLowerCase()
                const detectar = () => {
                  if (/histór|crime|mister|terror|assassin|guerra|trágic|drama|morte|catástro/.test(titulo))
                    return { modelo: 'aiImageGeneration', label: '🖼️ Imagens IA', motivo: 'Roteiros de história e drama ficam perfeitos com imagens IA únicas para cada cena.' }
                  if (/animaç|palitinho|personagem|aventura|hero|cartoon|comic/.test(titulo))
                    return { modelo: 'stickAnimation', label: '🎨 Animação de Palitinho', motivo: 'Narrativas com personagens ficam excelentes com animações de palitinho personalizadas.' }
                  if (/dark|sombri|épico|dramátic|sinistro|chocante/.test(titulo))
                    return { modelo: 'darkStickman', label: '🖤 Dark Stickman', motivo: 'Conteúdo sombrio ou épico combina com o estilo dark com efeitos de zoom e shake.' }
                  if (/tecnolog|ia |inteligência|futuro|robô|science|ciência/.test(titulo))
                    return { modelo: 'aiImageGeneration', label: '🖼️ Imagens IA', motivo: 'Conteúdo de tecnologia fica impactante com imagens IA personalizadas por cena.' }
                  if (/notícia|news|esporte|política|atual/.test(titulo))
                    return { modelo: 'stockImages', label: '📸 Imagens Stock', motivo: 'Conteúdo jornalístico ou atual requer imagens reais para transmitir credibilidade.' }
                  return { modelo: 'aiImageGeneration', label: '🖼️ Imagens IA', motivo: 'Imagens geradas por IA ficam muito mais relacionadas ao conteúdo narrado!' }
                }
                const rec = detectar()
                if (!rec || !roteiroManual.titulo) return (
                  <div style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', padding: '9px 13px', marginBottom: '10px', fontSize: '0.85em', color: '#6b7280' }}>
                    💡 <strong>Dica:</strong> Digite o título do seu roteiro e receberá uma sugestão de modelo ideal para o tipo de conteúdo.
                  </div>
                )
                const isSelected = roteiroManual.tipoVideo === rec.modelo
                return (
                  <div style={{
                    background: isSelected ? '#e8f5e9' : '#fff8e1',
                    border: `1.5px solid ${isSelected ? '#4caf50' : '#ffc107'}`,
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '10px',
                    fontSize: '0.88em',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}>
                    <span style={{ fontSize: '1.3em', lineHeight: 1 }}>{isSelected ? '✅' : '💡'}</span>
                    <div>
                      <strong style={{ color: isSelected ? '#2e7d32' : '#e65100' }}>
                        {isSelected ? 'Boa escolha para este tipo de roteiro!' : `Sugestão: ${rec.label}`}
                      </strong>
                      <div style={{ color: '#555', marginTop: '2px' }}>{rec.motivo}</div>
                      {!isSelected && (
                        <button
                          type="button"
                          onClick={() => setRoteiroManual(p => ({ ...p, tipoVideo: rec.modelo }))}
                          style={{ marginTop: '6px', fontSize: '0.85em', padding: '3px 10px', cursor: 'pointer', border: '1px solid #ffa000', borderRadius: '4px', background: '#fff3e0', color: '#e65100' }}
                        >
                          Usar {rec.label}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}
              <select value={roteiroManual.tipoVideo} onChange={e => setRoteiroManual(p => ({ ...p, tipoVideo: e.target.value }))}>
                <optgroup label="✅ Gratuitos">
                  <option value="stockImages">📸 Imagens Stock (Pexels) 🟢</option>
                  <option value="stockVideos">🎬 Vídeos Stock (Pexels) 🟢</option>
                  <option value="aiImageGeneration">🖼️ Imagens IA — Flux.1/DALL-E se configurado 🟢/🟡</option>
                  <option value="stickAnimation">🎨 Animação de Palitinho (IA) 🟢</option>
                  <option value="darkStickman">🖤 Dark Stickman (Texto Animado) 🟢</option>
                  <option value="geminiVeoGeneration">🎬 Gemini Veo (Google - Gratuito) 🟢</option>
                </optgroup>
                <optgroup label="💳 Pagos">
                  <option value="replicateGeneration">🤖 Replicate / Wan 2.1 🟡</option>
                  <option value="klingGeneration">🎥 Kling AI (~R$0,06/cena) 🟡</option>
                  <option value="veoGeneration">🎬 Veo 3 (Google Vertex) 🟡</option>
                  <option value="didAvatar">🎭 D-ID Avatar Apresentador 🟡</option>
                </optgroup>
              </select>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📝 Roteiro (cada parágrafo = 1 cena)</span>
              </label>
              <textarea
                value={roteiroManual.texto}
                onChange={e => setRoteiroManual(p => ({ ...p, texto: e.target.value }))}
                placeholder={`Cole aqui a narração do seu vídeo.\n\nSepare as cenas com uma linha em branco entre cada parágrafo.\n\nExemplo:\nEra uma vez um palitinho chamado João que sonhava em ir ao espaço. Todo dia ele olhava para o céu e imaginava as estrelas brilhando.\n\nDepois de anos estudando, João finalmente construiu seu foguete. Os amigos riam, mas ele não desistia. Cada fracasso era uma lição.\n\nNo dia do lançamento, o foguete decolou e João chegou ao espaço. Olhando para a Terra lá de cima, percebeu que valeu cada esforço.`}
                style={{ minHeight: '280px', fontFamily: 'inherit', lineHeight: '1.6' }}
                required
              />
              <small style={{ color: '#888', fontSize: '0.82em' }}>
                💡 Cada parágrafo separado por linha em branco vira uma cena. Mínimo 3 parágrafos recomendado.
              </small>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={roteiroManual.publicarYoutube}
                  onChange={e => setRoteiroManual(p => ({ ...p, publicarYoutube: e.target.checked }))}
                  disabled={!config.youtube_connected} style={{ width: 'auto' }} />
                <span>📺 Publicar automaticamente no YouTube</span>
                {!config.youtube_connected && <span style={{ fontSize: '12px', color: '#999' }}>(conecte nas configurações)</span>}
              </label>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Criando...' : '🎬 Criar Vídeo com Meu Roteiro'}
            </button>
          </form>
        )}

        {/* Modo IA */}
        {modoRoteiro === 'ia' && (
        <>
        <p style={{ marginBottom: '20px', color: '#666' }}>Descreva o que você quer e deixe a IA fazer o resto</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>O que você quer criar?</label>
            <input
              type="text"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              placeholder="Ex: 10 curiosidades sobre o oceano"
              required
            />
          </div>

          <div className="form-group">
            <label>Nicho / Categoria</label>
            <select name="nicho" value={formData.nicho} onChange={handleChange}>
              <option value="curiosidades">🔍 Curiosidades</option>
              <option value="tecnologia">💻 Tecnologia</option>
              <option value="educacao">📚 Educação</option>
              <option value="entretenimento">🎮 Entretenimento</option>
              <option value="financas">💰 Finanças</option>
              <option value="saude">🏥 Saúde</option>
              <option value="historias">📖 Histórias</option>
            </select>
          </div>

          <div className="form-group">
            <label>Tipo de Vídeo</label>
            {(() => {
              const recomendacoes = {
                curiosidades: { modelo: 'aiImageGeneration', label: '🖼️ Imagens IA', motivo: 'Imagens geradas por IA ficam muito mais relacionadas ao conteúdo que imagens stock genéricas!' },
                educacao: { modelo: 'aiImageGeneration', label: '🖼️ Imagens IA', motivo: 'Conteúdo educativo fica mais visual com imagens IA personalizadas para cada cena.' },
                historias: { modelo: 'aiImageGeneration', label: '🖼️ Imagens IA', motivo: 'Histórias e narrativas ficam perfeitas com imagens únicas criadas por IA para cada cena.' },
                entretenimento: { modelo: 'darkStickman', label: '🖤 Dark Stickman', motivo: 'Perfeito para entretenimento — efeitos dramáticos de zoom e shake capturam atenção rapidamente.' },
                tecnologia: { modelo: 'aiImageGeneration', label: '🖼️ Imagens IA', motivo: 'Tecnologia pede visual moderno — imagens IA criam visuais futuristas e personalizado por cena.' },
                financas: { modelo: 'aiImageGeneration', label: '🖼️ Imagens IA', motivo: 'Imagens IA geram visuais específicos para cada conceito financeiro, muito melhor que stock.' },
                saude: { modelo: 'aiImageGeneration', label: '🖼️ Imagens IA', motivo: 'Imagens IA ilustram cada cena de saúde com precisão, sem depender de fotos genéricas.' },
                politica: { modelo: 'stockImages', label: '📸 Imagens Stock', motivo: 'Conteúdo político exige imagens reais para credibilidade e veracidade.' },
                esportes: { modelo: 'replicateGeneration', label: '🤖 Replicate / Wan 2.1', motivo: 'Esportes ganham com vídeos dinâmicos gerados por IA, com movimento e ação nas cenas.' },
              }
              const rec = recomendacoes[formData.nicho]
              if (!rec) return null
              const isSelected = formData.tipoVideo === rec.modelo
              return (
                <div style={{
                  background: isSelected ? '#e8f5e9' : '#fff8e1',
                  border: `1.5px solid ${isSelected ? '#4caf50' : '#ffc107'}`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '10px',
                  fontSize: '0.88em',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}>
                  <span style={{ fontSize: '1.3em', lineHeight: 1 }}>{isSelected ? '✅' : '💡'}</span>
                  <div>
                    <strong style={{ color: isSelected ? '#2e7d32' : '#e65100' }}>
                      {isSelected ? 'Boa escolha para este nicho!' : `Recomendado para "${formData.nicho}": ${rec.label}`}
                    </strong>
                    <div style={{ color: '#555', marginTop: '2px' }}>{rec.motivo}</div>
                    {!isSelected && (
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, tipoVideo: rec.modelo }))}
                        style={{ marginTop: '6px', fontSize: '0.85em', padding: '3px 10px', cursor: 'pointer', border: '1px solid #ffa000', borderRadius: '4px', background: '#fff3e0', color: '#e65100' }}
                      >
                        Usar {rec.label}
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}
            <select name="tipoVideo" value={formData.tipoVideo} onChange={handleChange}>
              <optgroup label="✅ Gratuitos">
                <option value="stockImages">📸 Imagens Stock (Pexels) 🟢</option>
                <option value="stockVideos">🎬 Vídeos Stock (Pexels) 🟢</option>
                <option value="aiImageGeneration">🖼️ Imagens IA — Flux.1/DALL-E se configurado, senão Grátis 🟢/🟡</option>
                <option value="stickAnimation">🎨 Animação de Palitinho (IA) 🟢</option>
                <option value="darkStickman">🖤 Dark Stickman (Texto Animado) 🟢</option>
                <option value="geminiVeoGeneration">🎬 Gemini Veo (Google - Gratuito) 🟢</option>
              </optgroup>
              <optgroup label="🖥️ Open Source / Local">
                <option value="localAIGeneration">🤖 IA Local - Open Source (CPU/GPU) 🟢</option>
              </optgroup>
              <optgroup label="💳 Pagos">
                <option value="replicateGeneration">🤖 Replicate / Wan 2.1 (~$0.005-0.02) 🟡</option>
                <option value="klingGeneration">🎥 Kling AI (~$0.01-0.04/cena) 🟡</option>
                <option value="huggingfaceGeneration">🧠 Hugging Face (Créditos HF) 🟡</option>
                <option value="veoGeneration">🎬 Veo 3 (Google Vertex - Pago) 🟡</option>
                <option value="soraGeneration">🌟 Sora (OpenAI - Pago) 🟡</option>
                <option value="didAvatar">🎭 D-ID Avatar Apresentador (Pago) 🟡</option>
              </optgroup>
            </select>
            <small style={{ color: '#666', fontSize: '0.85em', marginTop: '5px', display: 'block' }}>
              {formData.tipoVideo === 'stickAnimation' 
                ? '✨ A IA vai gerar código de animação personalizado para cada cena!'
                : formData.tipoVideo === 'darkStickman'
                ? '🖤 Cenas com texto animado estilo canais dark — zoom, shake, efeitos dramáticos. Zero IA, 100% local e rápido!'
                : formData.tipoVideo === 'stockVideos'
                ? '🎬 Vídeos reais do Pexels em vez de imagens — mais dinâmico e profissional! 100% gratuito.'
                                : formData.tipoVideo === 'klingGeneration'
                ? '🎥 Kling AI gera vídeos realistas por IA (~$0.01-0.04/cena). Requer chaves em platform.klingai.com'
                : formData.tipoVideo === 'veoGeneration'
                ? '🎬 Veo 3 do Google gera vídeos cinematográficos por IA (pago ~$0.35/s)'
                : formData.tipoVideo === 'soraGeneration'
                ? '🌟 Sora da OpenAI gera vídeos ultrarrealistas (requer assinatura)'
                : formData.tipoVideo === 'geminiVeoGeneration'
                ? '🎬 Usa Veo 2 via Google AI Studio — gratuito com limites diários!'
                : formData.tipoVideo === 'replicateGeneration'
                ? '🤖 Wan via Replicate — requer créditos (~$0.01-0.05/vídeo)'
                : formData.tipoVideo === 'huggingfaceGeneration'
                ? '🧠 Wan2.2 via HF Inference Providers — requer créditos pré-pagos na conta HF'
                : formData.tipoVideo === 'localAIGeneration'
                ? '🖥️ Modelos open source rodando na sua máquina — 100% gratuito, sem API key! ⚠️ Lento sem GPU (10-60min/cena)'
                : formData.tipoVideo === 'aiImageGeneration'
                ? '🖼️ Com OpenAI key → DALL-E 3 🟡 | Com Replicate key → Flux.1 🟡 | Sem chave → Stable Horde/Pollinations 🟢'
                : formData.tipoVideo === 'didAvatar'
                ? '🎭 Apresentador virtual animado lendo a narração. Requer DID_API_KEY + DID_PRESENTER_URL nas Configurações 🟡'
                : '📷 Busca imagens reais do Pexels. Com PIXABAY_API_KEY adiciona música de fundo 🟢 | Legendas Whisper automáticas 🟢'}
            </small>
            {PAID_TYPES[formData.tipoVideo] && (
              <div style={{ marginTop: '8px', padding: '10px 14px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', fontSize: '12px' }}>
                <strong>💰 Custo estimado:</strong> {PAID_TYPES[formData.tipoVideo].calcCost(formData.duracao).total}
                <br />
                <span style={{ color: '#856404' }}>{PAID_TYPES[formData.tipoVideo].calcCost(formData.duracao).detalhe}</span>
                <br />
                <span style={{ color: '#856404', fontSize: '11px' }}>⚠️ {PAID_TYPES[formData.tipoVideo].warning}</span>
              </div>
            )}
            {!PAID_TYPES[formData.tipoVideo] && (
              <div style={{ marginTop: '8px', padding: '8px 14px', background: '#d4edda', border: '1px solid #28a745', borderRadius: '8px', fontSize: '12px', color: '#155724' }}>
                ✅ <strong>Gratuito</strong> — Este tipo de vídeo não consome APIs pagas.
                {formData.tipoVideo === 'stockImages' || formData.tipoVideo === 'stockVideos'
                  ? ' Usa Pexels (gratuito, ilimitado).'
                  : formData.tipoVideo === 'geminiVeoGeneration'
                  ? ' Usa Google AI Studio (gratuito com limites diários).'
                  : formData.tipoVideo === 'localAIGeneration'
                  ? ' Roda modelos open source na sua máquina.'
                  : ''}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Duração desejada (minutos)</label>
            <select name="duracao" value={formData.duracao} onChange={handleChange}>
              <option value="5">5 minutos</option>
              <option value="8">8 minutos</option>
              <option value="10">10 minutos</option>
              <option value="15">15 minutos</option>
              <option value="20">20 minutos</option>
            </select>
          </div>

          <div className="form-group">
            <label>Detalhes adicionais (opcional)</label>
            <textarea
              name="detalhes"
              value={formData.detalhes}
              onChange={handleChange}
              placeholder="Ex: Foque em fatos científicos, use tom educativo..."
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="publicarYoutube"
                checked={formData.publicarYoutube}
                onChange={handleChange}
                disabled={!config.youtube_connected}
                style={{ width: 'auto' }}
              />
              <span>📺 Publicar automaticamente no YouTube</span>
              {!config.youtube_connected && (
                <span style={{ fontSize: '12px', color: '#999' }}>(conecte o YouTube nas configurações)</span>
              )}
            </label>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="legendas"
                checked={formData.legendas}
                onChange={handleChange}
                style={{ width: 'auto' }}
              />
              <span>💬 Legendas automáticas (Whisper)</span>
            </label>
            {formData.legendas && (
              <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '0.9em', color: '#666' }}>Estilo da legenda:</label>
                <select name="estiloLegenda" value={formData.estiloLegenda} onChange={handleChange} style={{ marginLeft: '8px' }}>
                  <option value="classic">📝 Clássico (branco com contorno)</option>
                  <option value="bold">💪 Bold (grande e grosso)</option>
                  <option value="neon">💜 Neon (ciano com contorno roxo)</option>
                  <option value="minimal">✨ Minimal (sutil e elegante)</option>
                  <option value="cinematic">🎬 Cinematográfico (centralizado embaixo)</option>
                  <option value="yellow">💛 Amarelo (destaque amarelo)</option>
                </select>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '⏳ Criando...' : '🚀 Criar Vídeo Automaticamente'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true)
              try {
                const r = await axios.post(`${API_URL}/videos/demo`)
                await carregarVideos()
                setMonitorVideoId(r.data.videoId)
                setMonitorMinimized(false)
                setMonitorVideo(null)
                alert(`✅ Vídeo demo iniciado! ID: ${r.data.videoId}\nAcompanhe o progresso no painel lateral.`)
              } catch (e) {
                alert('❌ Erro: ' + (e.response?.data?.error || e.message))
              } finally {
                setLoading(false)
              }
            }}
            style={{
              marginTop: '10px', width: '100%', padding: '12px',
              background: 'linear-gradient(135deg, #6c3483, #a855f7)',
              color: '#fff', border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95em'
            }}
          >
            🎭 Criar Vídeo Demo (sem API key)
          </button>
        </form>
        </>
        )}
      </div>
      )}

      {/* Lista de vídeos */}
      {activeTab === 'videos' && videos.length > 0 && (
        <div className="main-card">
          <h2>📹 Seus Vídeos ({videos.length})</h2>
          
          <div className="videos-grid">
            {videos.map((video) => (
              <div key={video.id} className="video-card">
                <h3>{video.titulo}</h3>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                  {video.nicho} • {video.duracao} min
                </p>
                
                <div className={getStatusClass(video.status)}>
                  {getStatusEmoji(video.status)} {video.status.replace(/_/g, ' ').toUpperCase()}
                </div>
                
                {video.progresso > 0 && (
                  <>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${video.progresso}%` }}
                      />
                    </div>
                    <p style={{ fontSize: '12px', color: '#666' }}>
                      {video.etapa}
                    </p>
                  </>
                )}

                {video.status === 'concluido' && video.videoUrl && (
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ fontSize: '12px', marginBottom: '8px' }}>
                      ✅ Vídeo pronto!
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <a
                        href={`${API_URL.replace('/api', '')}${video.videoUrl}`}
                        download
                        style={{
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 14px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '12px',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        ⬇️ Baixar Vídeo
                      </a>
                      {config.youtube_connected && !video.youtubeId && (
                        <button
                          onClick={async () => {
                            try {
                              const r = await axios.post(`${API_URL}/videos/${video.id}/publish-youtube`)
                              alert(`✅ Publicado no YouTube! ID: ${r.data.youtubeId}`)
                              carregarVideos()
                            } catch (err) {
                              alert('❌ Erro ao publicar: ' + (err.response?.data?.error || err.message))
                            }
                          }}
                          style={{
                            background: '#FF0000',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '13px'
                          }}
                        >
                          ▶️ Publicar no YouTube
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const titulo = video.roteiro?.titulo || video.titulo || 'Meu vídeo'
                          const texto = `🎬 ${titulo}\n\nCriado com VideoForge`
                          navigator.clipboard.writeText(texto).then(() => alert('📋 Título copiado! Cole nas suas redes sociais.'))
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '12px',
                        }}
                      >
                        📤 Copiar p/ compartilhar
                      </button>
                    </div>
                  </div>
                )}

                {video.status === 'publicado' && video.youtubeId && (
                  <div style={{ marginTop: '12px' }}>
                    <p style={{ fontSize: '13px', marginBottom: '8px' }}>
                      🎉 <a
                        href={`https://youtube.com/watch?v=${video.youtubeId}`}
                        target="_blank"
                        style={{ color: '#667eea', fontWeight: 600 }}
                      >
                        Ver no YouTube →
                      </a>
                    </p>

                    {/* Botões de ação: Baixar e Republicar */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      {video.videoUrl && (
                        <a
                          href={`${API_URL.replace('/api', '')}${video.videoUrl}`}
                          download
                          style={{
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 14px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '12px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          ⬇️ Baixar Vídeo
                        </a>
                      )}
                      {video.roteiro && (
                        <a
                          href={`${API_URL}/videos/${video.id}/roteiro`}
                          download
                          style={{
                            background: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 14px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '12px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          📝 Exportar Roteiro
                        </a>
                      )}
                      {video.subtitlePath && (
                        <a
                          href={`${API_URL}/videos/${video.id}/srt`}
                          download
                          style={{
                            background: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 14px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '12px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          💬 Exportar SRT
                        </a>
                      )}
                      <button
                        onClick={async () => {
                          if (!confirm('Republicar este vídeo no YouTube? (será feito um novo upload)')) return
                          try {
                            const r = await axios.post(`${API_URL}/videos/${video.id}/publish-youtube`)
                            alert(`✅ Republicado no YouTube! Novo ID: ${r.data.youtubeId}`)
                            carregarVideos()
                          } catch (err) {
                            alert('❌ Erro ao republicar: ' + (err.response?.data?.error || err.message))
                          }
                        }}
                        style={{
                          background: '#FF0000',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 14px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '12px'
                        }}
                      >
                        🔄 Republicar YouTube
                      </button>
                    </div>
                    
                    {/* Compartilhamentos automáticos realizados */}
                    {video.compartilhamentos && video.compartilhamentos.length > 0 && (
                      <div style={{ fontSize: '12px', marginBottom: '8px', padding: '6px 10px', background: '#f0fdf4', borderRadius: '6px' }}>
                        {video.compartilhamentos.map((c, i) => (
                          <span key={i} style={{ marginRight: '8px' }}>
                            {c.sucesso ? '✅' : '❌'} {c.rede}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Botão único de compartilhar */}
                    <div style={{ marginTop: '10px' }}>
                      <p style={{ fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>📤 Compartilhar nas redes:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {[
                          { name: '🐦 X', bg: '#000', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(video.roteiro?.titulo || video.titulo)}&url=${encodeURIComponent(`https://youtube.com/watch?v=${video.youtubeId}`)}` },
                          { name: '📘 Facebook', bg: '#1877F2', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://youtube.com/watch?v=${video.youtubeId}`)}` },
                          { name: '📸 Instagram', bg: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', url: `https://www.instagram.com/`, tip: 'Abra o Instagram e cole o link do vídeo' },
                          { name: '🎵 TikTok', bg: '#000', url: `https://www.tiktok.com/upload`, tip: 'Abra o TikTok e faça upload do vídeo' },
                          { name: '💼 LinkedIn', bg: '#0A66C2', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://youtube.com/watch?v=${video.youtubeId}`)}` },
                          { name: '💬 WhatsApp', bg: '#25D366', url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${video.roteiro?.titulo || video.titulo} - https://youtube.com/watch?v=${video.youtubeId}`)}` },
                          { name: '✈️ Telegram', bg: '#0088CC', url: `https://t.me/share/url?url=${encodeURIComponent(`https://youtube.com/watch?v=${video.youtubeId}`)}&text=${encodeURIComponent(video.roteiro?.titulo || video.titulo)}` },
                          { name: '🔴 Reddit', bg: '#FF4500', url: `https://reddit.com/submit?url=${encodeURIComponent(`https://youtube.com/watch?v=${video.youtubeId}`)}&title=${encodeURIComponent(video.roteiro?.titulo || video.titulo)}` },
                        ].map((s, i) => (
                          <a key={i} href={s.url} target="_blank" title={s.tip || `Compartilhar no ${s.name}`}
                            style={{
                              padding: '5px 10px', borderRadius: '6px', color: '#fff', fontSize: '11px',
                              fontWeight: 600, textDecoration: 'none', background: s.bg, cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: '3px',
                            }}>
                            {s.name}
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Editor de Cenas */}
                    {video.status === 'pronto' && (
                      <div style={{ marginTop: '10px' }}>
                        <button
                          onClick={() => toggleEditorCenas(video.id)}
                          style={{
                            background: 'none', border: '1px solid #667eea', color: '#667eea',
                            borderRadius: '6px', padding: '6px 12px', cursor: 'pointer',
                            fontSize: '12px', fontWeight: 600
                          }}
                        >
                          {editorCenas[video.id]?.open ? '✕ Fechar Editor de Cenas' : '🎬 Editor de Cenas'}
                        </button>
                        {editorCenas[video.id]?.open && (
                          <div style={{ marginTop: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
                            {editorCenas[video.id]?.loading ? (
                              <p style={{ fontSize: '12px', color: '#888' }}>Carregando cenas...</p>
                            ) : editorCenas[video.id]?.error ? (
                              <p style={{ fontSize: '12px', color: '#dc2626' }}>{editorCenas[video.id].error}</p>
                            ) : (
                              <div>
                                <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                                  Altere a mídia de cada cena individualmente. Cole a URL da nova imagem ou vídeo.
                                </p>
                                {editorCenas[video.id]?.cenas?.map((cena, idx) => (
                                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px', borderBottom: idx < editorCenas[video.id].cenas.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                    <div style={{ minWidth: '30px', fontWeight: 700, color: '#667eea', fontSize: '14px' }}>
                                      #{cena.numero}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <p style={{ fontSize: '11px', color: '#333', margin: '0 0 4px 0' }}>
                                        {cena.texto_narracao?.substring(0, 100)}{cena.texto_narracao?.length > 100 ? '...' : ''}
                                      </p>
                                      {cena.media && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                          <span style={{ fontSize: '10px', background: cena.media.tipo === 'video' ? '#7c3aed' : '#059669', color: '#fff', padding: '1px 6px', borderRadius: '4px' }}>
                                            {cena.media.tipo === 'video' ? '🎬 Vídeo' : '📸 Imagem'}
                                          </span>
                                          <span style={{ fontSize: '10px', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                            {cena.media.url}
                                          </span>
                                        </div>
                                      )}
                                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <input
                                          type="text"
                                          placeholder="Cole URL da nova mídia..."
                                          id={`media-input-${video.id}-${cena.numero}`}
                                          style={{ flex: 1, fontSize: '11px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                        />
                                        <button
                                          onClick={() => {
                                            const input = document.getElementById(`media-input-${video.id}-${cena.numero}`)
                                            if (input?.value) {
                                              const tipo = input.value.match(/\.(mp4|webm|mov)/i) ? 'video' : 'imagem'
                                              trocarMidiaCena(video.id, cena.numero, input.value, tipo)
                                              input.value = ''
                                            }
                                          }}
                                          style={{ fontSize: '11px', padding: '4px 10px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                          Trocar
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {video.status === 'erro' && (
                  <p style={{ marginTop: '10px', fontSize: '12px', color: '#dc2626' }}>
                    ❌ {video.etapa}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'videos' && videos.length === 0 && (
        <div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>
          <p style={{ fontSize: '18px' }}>
            Nenhum vídeo criado ainda. Comece agora! ☝️
          </p>
        </div>
      )}

      {/* ==========================================
          ABA DE NOTÍCIAS
          ========================================== */}
      {activeTab === 'news' && (
        <>
          {/* Ação principal: coletar + gerar */}
          <div className="main-card" style={{ textAlign: 'center' }}>
            <h2>📰 Compilação de Notícias do Dia</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Coleta automática de RSS → Roteiro com IA → Vídeo estilo news → YouTube
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn-collect"
                onClick={coletarNoticiasAgora}
                disabled={collectLoading}
              >
                {collectLoading ? '⏳ Coletando...' : '📡 Coletar Notícias Agora'}
              </button>
              <button
                className="btn-news"
                onClick={gerarVideoNoticias}
                disabled={newsLoading}
                style={{ maxWidth: '400px' }}
              >
                {newsLoading ? '⏳ Gerando...' : '🚀 Gerar Vídeo de Notícias'}
              </button>
            </div>
          </div>

          <div className="news-grid">
            {/* Fontes RSS */}
            <div className="news-section">
              <h3>📡 Fontes RSS ({newsSources.length})</h3>
              <div className="source-list">
                {newsSources.map((s) => (
                  <div key={s.id} className="source-item">
                    <div className="source-info">
                      <strong>{s.nome}</strong>
                      <small>{s.url}</small>
                    </div>
                    <div className="source-actions">
                      <button
                        className={`source-toggle ${s.ativo ? 'active' : 'inactive'}`}
                        onClick={() => toggleFonte(s.id, s.ativo)}
                      >
                        {s.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                      <button className="source-delete" onClick={() => deletarFonteUI(s.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
              <form className="add-source-form" onSubmit={adicionarFonte}>
                <input
                  placeholder="Nome"
                  value={newSourceForm.nome}
                  onChange={(e) => setNewSourceForm({ ...newSourceForm, nome: e.target.value })}
                  required
                />
                <input
                  placeholder="URL do RSS"
                  value={newSourceForm.url}
                  onChange={(e) => setNewSourceForm({ ...newSourceForm, url: e.target.value })}
                  required
                  style={{ flex: 2 }}
                />
                <select
                  value={newSourceForm.categoria}
                  onChange={(e) => setNewSourceForm({ ...newSourceForm, categoria: e.target.value })}
                  style={{ padding: '8px', borderRadius: '6px', border: '2px solid #e0e0e0', fontSize: '13px' }}
                >
                  <option value="geral">Geral</option>
                  <option value="tecnologia">Tech</option>
                  <option value="economia">Economia</option>
                  <option value="mundo">Mundo</option>
                  <option value="ciencia">Ciência</option>
                  <option value="politica">Política</option>
                  <option value="esporte">Esporte</option>
                </select>
                <button type="submit">+ Adicionar</button>
              </form>
            </div>

            {/* Notícias coletadas */}
            <div className="news-section">
              <h3>📋 Notícias Coletadas ({newsItems.length})</h3>
              <div className="news-items-list">
                {newsItems.length === 0 && (
                  <p style={{ color: '#999', fontSize: '14px', padding: '20px', textAlign: 'center' }}>
                    Nenhuma notícia coletada. Clique em "Coletar Notícias Agora".
                  </p>
                )}
                {newsItems.slice(0, 30).map((n) => (
                  <div key={n.id} className="news-item">
                    <h4>{n.titulo}</h4>
                    {n.resumo && <p>{n.resumo.substring(0, 150)}...</p>}
                    <div className="news-item-meta">
                      <span>📰 {n.fonte}</span>
                      <span>🏷️ {n.categoria}</span>
                      <span>{n.usado_em_video ? '✅ Usado' : '🆕 Disponível'}</span>
                      {n.publicado_em && <span>🕐 {new Date(n.publicado_em).toLocaleDateString('pt-BR')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Configuração de Notícias */}
          <div className="news-section" style={{ marginBottom: '20px' }}>
            <h3>⚙️ Configurações de Notícias</h3>
            <div className="news-config-grid">
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px' }}>Tom da narração</label>
                <select
                  value={newsConfig.tom || 'casual'}
                  onChange={(e) => salvarNewsConfig('tom', e.target.value)}
                  style={{ padding: '10px', borderRadius: '8px', border: '2px solid #e0e0e0', width: '100%' }}
                >
                  <option value="casual">😎 Casual</option>
                  <option value="formal">👔 Formal</option>
                  <option value="dramatico">🔥 Dramático</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px' }}>Horário do agendamento</label>
                <input
                  type="time"
                  value={newsConfig.horario_agendamento || '07:00'}
                  onChange={(e) => salvarNewsConfig('horario_agendamento', e.target.value)}
                  style={{ padding: '10px', borderRadius: '8px', border: '2px solid #e0e0e0', width: '100%' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px' }}>Máx. notícias por vídeo</label>
                <select
                  value={newsConfig.max_noticias || 8}
                  onChange={(e) => salvarNewsConfig('max_noticias', parseInt(e.target.value))}
                  style={{ padding: '10px', borderRadius: '8px', border: '2px solid #e0e0e0', width: '100%' }}
                >
                  {[3, 5, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n} notícias</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px' }}>Mínimo para gerar vídeo</label>
                <select
                  value={newsConfig.threshold_minimo || 3}
                  onChange={(e) => salvarNewsConfig('threshold_minimo', parseInt(e.target.value))}
                  style={{ padding: '10px', borderRadius: '8px', border: '2px solid #e0e0e0', width: '100%' }}
                >
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} notícias</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={newsConfig.publicar_youtube || false}
                  onChange={(e) => salvarNewsConfig('publicar_youtube', e.target.checked)}
                  style={{ width: 'auto' }}
                />
                <span>📺 Publicar automaticamente no YouTube {newsConfig.publicar_youtube ? '(ativo)' : '(desativado)'}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={newsConfig.ativo || false}
                  onChange={(e) => salvarNewsConfig('ativo', e.target.checked)}
                  style={{ width: 'auto' }}
                />
                <span>⏰ Agendamento automático diário {newsConfig.ativo ? '(ativo)' : '(desativado)'}</span>
              </label>
            </div>
          </div>

          {/* Vídeos de News gerados */}
          <div className="main-card">
            <h2>📹 Vídeos de Notícias ({newsVideos.length})</h2>
            {newsVideos.length === 0 ? (
              <p style={{ color: '#999', padding: '20px', textAlign: 'center' }}>
                Nenhum vídeo de notícias gerado ainda.
              </p>
            ) : (
              <div className="news-videos-grid">
                {newsVideos.map((v) => (
                  <div key={v.id} className="news-video-card">
                    <h4>{v.titulo || 'Gerando...'}</h4>
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                      {v.total_noticias ? `${v.total_noticias} notícias` : ''} •{' '}
                      {new Date(v.created_at).toLocaleDateString('pt-BR')}
                    </div>
                    <div className={`video-status status-${v.status}`}>
                      {getNewsStatusEmoji(v.status)} {v.status.replace(/_/g, ' ')}
                    </div>
                    {v.progresso > 0 && v.progresso < 100 && (
                      <>
                        <div className="progress-bar" style={{ marginTop: '8px' }}>
                          <div className="progress-fill" style={{ width: `${v.progresso}%` }} />
                        </div>
                        <p style={{ fontSize: '11px', color: '#888' }}>{v.etapa}</p>
                      </>
                    )}
                    {v.video_url && (
                      <div style={{ marginTop: '8px' }}>
                        <p style={{ fontSize: '12px', color: '#065f46', marginBottom: '6px' }}>
                          ✅ Vídeo pronto
                        </p>
                        {v.youtube_id ? (
                          <a
                            href={`https://youtube.com/watch?v=${v.youtube_id}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '12px', color: '#c0392b', textDecoration: 'none', fontWeight: 'bold' }}
                          >
                            📺 Ver no YouTube ({v.youtube_id})
                          </a>
                        ) : (
                          <button
                            className="btn-news"
                            style={{ fontSize: '11px', padding: '5px 12px', marginTop: '4px' }}
                            onClick={async () => {
                              try {
                                const r = await axios.post(`${API_URL}/news/videos/${v.id}/publish`)
                                alert(`✅ Publicado no YouTube! ID: ${r.data.youtube_id}`)
                                await carregarNewsVideos()
                              } catch (e) {
                                alert('❌ ' + (e.response?.data?.error || e.message))
                              }
                            }}
                          >
                            📺 Publicar no YouTube
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>

    {/* Modal de confirmação para serviços pagos */}
    {showPaidModal && paidModalInfo && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 9999
      }} onClick={() => { setShowPaidModal(false); setPaidModalInfo(null); }}>
        <div style={{
          backgroundColor: '#1e1e2e', borderRadius: '16px', padding: '32px',
          maxWidth: '480px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '1px solid #ff6b35'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '48px' }}>💳</span>
            <h2 style={{ color: '#ff6b35', margin: '12px 0 8px', fontSize: '1.3em' }}>
              Serviço Pago
            </h2>
            <p style={{ color: '#ccc', fontSize: '0.95em', margin: 0 }}>
              {paidModalInfo.icon} <strong>{paidModalInfo.label}</strong>
            </p>
          </div>

          <div style={{
            backgroundColor: '#2a2a3e', borderRadius: '10px', padding: '16px',
            marginBottom: '16px', border: '1px solid #444'
          }}>
            <p style={{ color: '#ff9966', margin: '0 0 8px', fontWeight: 'bold', fontSize: '0.9em' }}>
              ⚠️ Atenção — Este serviço tem custo!
            </p>
            <p style={{ color: '#aaa', margin: 0, fontSize: '0.85em' }}>
              {paidModalInfo.warning}
            </p>
          </div>

          {/* Estimativa de custo para o vídeo */}
          <div style={{
            backgroundColor: '#1a2a3a', borderRadius: '10px', padding: '16px',
            marginBottom: '16px', border: '1px solid #2a4a6a'
          }}>
            <p style={{ color: '#7bb8ff', margin: '0 0 10px', fontWeight: 'bold', fontSize: '0.9em' }}>
              💰 Estimativa para este vídeo ({paidModalInfo.duracao} min)
              <span style={{ fontWeight: 'normal', fontSize: '0.8em', color: '#6699bb', marginLeft: '8px' }}>
                (câmbio ~R${USD_BRL.toFixed(2)}/USD)
              </span>
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ color: '#aaa', fontSize: '0.82em' }}>{paidModalInfo.costInfo?.detalhe}</span>
            </div>
            <div style={{
              backgroundColor: '#0d1a2a', borderRadius: '8px', padding: '10px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span style={{ color: '#ccc', fontSize: '0.9em' }}>Total estimado:</span>
              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.15em' }}>
                {paidModalInfo.costInfo?.total}
              </span>
            </div>
          </div>

          <div style={{
            backgroundColor: '#1a3a1a', borderRadius: '10px', padding: '12px',
            marginBottom: '24px', border: '1px solid #2a5a2a'
          }}>
            <p style={{ color: '#7bdb7b', margin: 0, fontSize: '0.85em' }}>
              💡 <strong>Alternativas gratuitas:</strong> Animação de Palitinho, Imagens Stock (Pexels), 
              Gemini Veo, Replicate/Wan2.1 ou IA Local (Open Source)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => { setShowPaidModal(false); setPaidModalInfo(null); }}
              style={{
                flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #555',
                backgroundColor: '#333', color: '#fff', cursor: 'pointer',
                fontSize: '0.95em', fontWeight: 'bold'
              }}
            >
              ← Voltar (Usar Gratuito)
            </button>
            <button
              onClick={() => enviarVideo()}
              style={{
                flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
                backgroundColor: '#ff6b35', color: '#fff', cursor: 'pointer',
                fontSize: '0.95em', fontWeight: 'bold'
              }}
            >
              Continuar com Pago →
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ==== PAINEL DE MONITORAMENTO EM TEMPO REAL ==== */}
    {monitorVideoId && monitorVideo && (
      <div style={{
        position: 'fixed', bottom: '20px', right: '20px', width: monitorMinimized ? '280px' : '380px',
        background: '#1a1a2e', border: '1px solid #8b5cf6', borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(139,92,246,0.35)', zIndex: 9999, color: '#e2e8f0',
        fontFamily: 'monospace', fontSize: '13px', overflow: 'hidden', transition: 'all 0.3s'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: '#16213e', borderBottom: '1px solid #8b5cf6',
          cursor: 'pointer'
        }} onClick={() => setMonitorMinimized(m => !m)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
            <span style={{ fontSize: '16px' }}>
              {['pronto','concluido','publicado'].includes(monitorVideo.status) ? '✅' :
               monitorVideo.status === 'erro' ? '❌' : '🟣'}
            </span>
            <span style={{ fontWeight: 'bold', color: '#a5b4fc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {monitorVideo.titulo || 'Vídeo'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); setMonitorMinimized(m => !m) }} style={{
              background: 'none', border: '1px solid #444', borderRadius: '4px', color: '#aaa',
              cursor: 'pointer', padding: '2px 7px', fontSize: '12px'
            }}>{monitorMinimized ? '▲' : '▼'}</button>
            <button onClick={e => { e.stopPropagation(); setMonitorVideoId(null); setMonitorVideo(null) }} style={{
              background: 'none', border: '1px solid #6b7280', borderRadius: '4px', color: '#f87171',
              cursor: 'pointer', padding: '2px 7px', fontSize: '12px'
            }}>✕</button>
          </div>
        </div>

        {!monitorMinimized && (
          <div style={{ padding: '12px 14px' }}>
            {/* Barra de progresso */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                <span>{monitorVideo.status?.replace(/_/g, ' ').toUpperCase()}</span>
                <span>{monitorVideo.progresso ?? 0}%</span>
              </div>
              <div style={{ background: '#2d3748', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
                <div style={{
                  width: `${monitorVideo.progresso ?? 0}%`, height: '100%',
                  background: monitorVideo.status === 'erro'
                    ? '#ef4444'
                    : ['pronto','concluido','publicado'].includes(monitorVideo.status)
                    ? '#22c55e'
                    : 'linear-gradient(90deg, #8b5cf6, #a855f7)',
                  borderRadius: '6px', transition: 'width 0.5s ease'
                }} />
              </div>
            </div>

            {/* Timeline de etapas */}
            <div style={{
              maxHeight: '220px', overflowY: 'auto', display: 'flex',
              flexDirection: 'column', gap: '4px',
            }}>
              {(monitorVideo.logEtapas || []).map((step, i) => {
                const isLast = i === (monitorVideo.logEtapas.length - 1)
                const relTime = (() => {
                  try {
                    const ms = new Date() - new Date(step.ts)
                    if (ms < 60000) return `${Math.floor(ms/1000)}s`
                    return `${Math.floor(ms/60000)}m`
                  } catch { return '' }
                })()
                return (
                  <div key={i} style={{
                    display: 'flex', gap: '8px', alignItems: 'flex-start',
                    opacity: isLast ? 1 : 0.65,
                    fontWeight: isLast ? 'bold' : 'normal',
                    color: isLast ? '#e2e8f0' : '#94a3b8',
                    borderLeft: isLast ? '2px solid #8b5cf6' : '2px solid #334155',
                    paddingLeft: '8px', paddingBottom: '2px'
                  }}>
                    <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', marginTop: '2px' }}>
                      {relTime}
                    </span>
                    <span>{step.msg}</span>
                  </div>
                )
              })}
              <div ref={monitorEndRef} />
            </div>

            {/* Link para download se pronto */}
            {['pronto','concluido'].includes(monitorVideo.status) && monitorVideo.videoUrl && (
              <a href={monitorVideo.videoUrl} target="_blank" rel="noreferrer" style={{
                display: 'block', marginTop: '10px', textAlign: 'center',
                background: '#22c55e', color: '#fff', borderRadius: '6px',
                padding: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px'
              }}>
                ⬇ Abrir Vídeo
              </a>
            )}
          </div>
        )}
      </div>
    )}

      {/* ==========================================
          ABA DE CORTES
          ========================================== */}
      {activeTab === 'cortes' && (
        <div className="main-card">
          <h2>✂️ Cortes Inteligentes</h2>
          <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
            Cole o link de qualquer vídeo do YouTube. A IA identifica os momentos mais virais e gera clipes prontos para publicar.
          </p>

          {/* Formulário de análise */}
          {!corteJob && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>
                  Link do YouTube
                </label>
                <input
                  type="url"
                  value={corteUrl}
                  onChange={e => setCorteUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input type="checkbox" checked={corteIsOwn} onChange={e => setCorteIsOwn(e.target.checked)} />
                <span>
                  <strong>Vídeo do meu canal</strong>
                  <span style={{ color: '#6b7280' }}> — usa dados reais de retenção do YouTube Analytics (mais preciso)</span>
                </span>
              </label>
              <button
                onClick={async () => {
                  if (!corteUrl.trim()) return
                  setCorteAnalyzing(true)
                  try {
                    const { data } = await axios.post(`${API_URL}/cortes/analyze`, { youtubeUrl: corteUrl, isOwnChannel: corteIsOwn })
                    const { data: job } = await axios.get(`${API_URL}/cortes/jobs/${data.jobId}`)
                    setCorteJob(job)
                    setCorteSelectedSegs([])
                  } catch (err) {
                    alert('Erro ao iniciar análise: ' + (err.response?.data?.error || err.message))
                  } finally {
                    setCorteAnalyzing(false)
                  }
                }}
                disabled={corteAnalyzing || !corteUrl.trim()}
                style={{
                  padding: '12px 24px', background: corteAnalyzing ? '#9ca3af' : '#8b5cf6',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontWeight: 'bold', cursor: corteAnalyzing ? 'not-allowed' : 'pointer', fontSize: '15px'
                }}
              >
                {corteAnalyzing ? '⏳ Iniciando...' : '🔍 Analisar Vídeo'}
              </button>
            </div>
          )}

          {/* Status/progresso do job */}
          {corteJob && (
            <div style={{ marginTop: '0' }}>
              {/* Cabeçalho do job */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  {corteJob.videoInfo && (
                    <p style={{ fontWeight: 'bold', margin: 0 }}>🎬 {corteJob.videoInfo.title}</p>
                  )}
                  <p style={{ color: '#6b7280', fontSize: '12px', margin: '2px 0 0' }}>{corteJob.youtubeUrl}</p>
                </div>
                <button
                  onClick={() => { setCorteJob(null); setCorteUrl(''); setCorteSelectedSegs([]); setCorteTitulos({}) }}
                  style={{ padding: '4px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                >
                  ✕ Novo corte
                </button>
              </div>

              {/* Log de etapas */}
              {corteJob.logEtapas && corteJob.logEtapas.length > 0 && (
                <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', maxHeight: '150px', overflowY: 'auto', fontSize: '12px' }}>
                  {corteJob.logEtapas.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', padding: '2px 0' }}>
                      <span style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>{new Date(step.ts).toLocaleTimeString('pt-BR')}</span>
                      <span>{step.msg}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Status aguardando */}
              {!['analisado', 'pronto', 'erro', 'erro_corte'].includes(corteJob.status) && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
                  <p style={{ margin: 0 }}>{corteJob.etapa}</p>
                </div>
              )}

              {/* Erro */}
              {['erro', 'erro_corte'].includes(corteJob.status) && (
                <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '8px', color: '#dc2626' }}>
                  ❌ {corteJob.etapa}
                </div>
              )}

              {/* Segmentos para cortar */}
              {corteJob.status === 'analisado' && corteJob.segments && (
                <div>
                  <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>🎯 Momentos identificados — selecione os que deseja cortar:</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {corteJob.segments.map((seg, i) => {
                      const selected = corteSelectedSegs.includes(i)
                      return (
                        <label key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px',
                          background: selected ? '#eef2ff' : '#f9fafb',
                          border: `1px solid ${selected ? '#818cf8' : '#e5e7eb'}`,
                          borderRadius: '8px', cursor: 'pointer'
                        }}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              setCorteSelectedSegs(prev =>
                                prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                              )
                            }}
                            style={{ marginTop: '2px' }}
                          />
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                              {seg.titulo}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                              ⏱ {Math.floor(seg.start / 60)}:{String(Math.round(seg.start % 60)).padStart(2,'0')} → {Math.floor(seg.end / 60)}:{String(Math.round(seg.end % 60)).padStart(2,'0')}
                              {' '}({Math.round(seg.end - seg.start)}s)
                            </div>
                            {seg.fonte && (
                              <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '8px', marginTop: '4px', display: 'inline-block',
                                background: seg.fonte === 'heatmap' ? '#fef3c7' : seg.fonte === 'analytics' ? '#dbeafe' : '#f3f4f6',
                                color: seg.fonte === 'heatmap' ? '#92400e' : seg.fonte === 'analytics' ? '#1e40af' : '#374151' }}>
                                {seg.fonte === 'heatmap' ? '🔥 Dados reais da barra do YouTube' : seg.fonte === 'analytics' ? '📊 YouTube Analytics' : '🤖 Whisper + Gemini AI'}
                              </span>
                            )}
                            {seg.motivo && <div style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>💡 {seg.motivo}</div>}
                          </div>
                        </label>
                      )
                    })}
                  </div>

                  {/* Seleção de formatos */}
                  <div style={{ marginBottom: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '14px', marginTop: 0, marginBottom: '8px' }}>📐 Formatos de saída:</p>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {[
                        { key: 'short', label: '📱 Short (9:16, ≤59s)', desc: 'YouTube Shorts' },
                        { key: 'horizontal', label: '🖥 Horizontal (16:9)', desc: 'Clipe padrão' },
                        { key: 'compilation', label: '🎬 Compilação', desc: 'Todos os clipes concatenados' }
                      ].map(fmt => (
                        <label key={fmt.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                          <input
                            type="checkbox"
                            checked={corteFormats[fmt.key]}
                            onChange={e => setCorteFormats(prev => ({ ...prev, [fmt.key]: e.target.checked }))}
                          />
                          <span>{fmt.label}</span>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>({fmt.desc})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (corteSelectedSegs.length === 0) { alert('Selecione ao menos um segmento'); return }
                      const formats = Object.entries(corteFormats).filter(([,v]) => v).map(([k]) => k)
                      if (formats.length === 0) { alert('Selecione ao menos um formato'); return }
                      setCorteCutting(true)
                      try {
                        await axios.post(`${API_URL}/cortes/jobs/${corteJob.id}/cut`, { segmentIndexes: corteSelectedSegs, formats })
                        const { data } = await axios.get(`${API_URL}/cortes/jobs/${corteJob.id}`)
                        setCorteJob({ ...data, status: 'cortando' })
                      } catch (err) {
                        alert('Erro ao cortar: ' + (err.response?.data?.error || err.message))
                      } finally {
                        setCorteCutting(false)
                      }
                    }}
                    disabled={corteCutting || corteSelectedSegs.length === 0}
                    style={{
                      padding: '12px 24px', background: corteCutting ? '#9ca3af' : '#059669',
                      color: 'white', border: 'none', borderRadius: '8px',
                      fontWeight: 'bold', cursor: 'pointer', fontSize: '15px'
                    }}
                  >
                    {corteCutting ? '⏳ Iniciando corte...' : `✂️ Cortar ${corteSelectedSegs.length} segmento(s)`}
                  </button>
                </div>
              )}

              {/* Clipes gerados */}
              {corteJob.status === 'pronto' && corteJob.clips && corteJob.clips.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>🎉 Clipes prontos — publique ou baixe:</h3>

                  {/* Status TikTok */}
                  {!tiktokConectado && (
                    <div style={{ marginBottom: '12px', padding: '8px 12px', background: '#fef3c7', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span>🎵 TikTok não conectado — conecte para publicar também no TikTok</span>
                      <button onClick={async () => {
                        const { data } = await axios.get(`${API_URL}/social/tiktok/auth`)
                        window.open(data.authUrl, '_blank', 'width=600,height=700')
                        setTimeout(() => axios.get(`${API_URL}/social/tiktok/status`).then(r => setTiktokConectado(r.data.connected)).catch(() => {}), 5000)
                      }} style={{ padding: '4px 10px', background: '#010101', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        Conectar TikTok
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {corteJob.clips.map((clip, i) => {
                      const fmtLabel = { short: '📱 Short', horizontal: '🖥 Horizontal', compilation: '🎬 Compilação' }[clip.format] || clip.format
                      const titulo = corteTitulos[clip.file] !== undefined ? corteTitulos[clip.file] : clip.titulo
                      // Busca descrição gerada pelo Gemini via segIndex
                      const seg = clip.segIndex >= 0 ? corteJob.segments?.[clip.segIndex] : null
                      const descDefault = seg?.descricao || ''
                      const descricao = corteDescricoes[clip.file] !== undefined ? corteDescricoes[clip.file] : descDefault

                      const publicar = async (plataformas) => {
                        setCortePublishing(clip.file + plataformas.join(''))
                        try {
                          const { data: pub } = await axios.post(`${API_URL}/cortes/jobs/${corteJob.id}/publish`, {
                            clipFile: clip.file, titulo, descricao, isShort: clip.format === 'short', platforms: plataformas
                          })
                          const msgs = []
                          if (pub.youtube?.url) msgs.push(`📺 YouTube: ${pub.youtube.url}`)
                          if (pub.tiktok?.ok) msgs.push(`🎵 TikTok: enviado (ID ${pub.tiktok.publishId})`)
                          if (pub.youtube?.erro) msgs.push(`⚠️ YouTube: ${pub.youtube.erro}`)
                          if (pub.tiktok?.erro) msgs.push(`⚠️ TikTok: ${pub.tiktok.erro}`)
                          alert('✅ Resultado:\n' + msgs.join('\n'))
                        } catch (err) {
                          alert('Erro: ' + (err.response?.data?.error || err.message))
                        } finally {
                          setCortePublishing(null)
                        }
                      }

                      const isPublishing = cortePublishing && cortePublishing.startsWith(clip.file)

                      return (
                        <div key={i} style={{ padding: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px' }}>
                          {/* Cabeçalho do clip */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', padding: '2px 8px', background: '#dcfce7', borderRadius: '12px', color: '#166534' }}>{fmtLabel}</span>
                            {clip.start !== undefined && (
                              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                                {Math.floor(clip.start/60)}:{String(Math.round(clip.start%60)).padStart(2,'0')} → {Math.floor(clip.end/60)}:{String(Math.round(clip.end%60)).padStart(2,'0')}
                              </span>
                            )}
                          </div>

                          {/* Título editável */}
                          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '3px' }}>Título</label>
                          <input
                            type="text"
                            value={titulo}
                            onChange={e => setCorteTitulos(prev => ({ ...prev, [clip.file]: e.target.value }))}
                            placeholder="Título para publicação..."
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', marginBottom: '10px', boxSizing: 'border-box' }}
                          />

                          {/* Descrição / legenda editável */}
                          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '3px' }}>
                            Legenda + Hashtags <span style={{ fontWeight: 'normal', color: '#9ca3af' }}>(gerada pela IA — edite à vontade)</span>
                          </label>
                          <textarea
                            value={descricao}
                            onChange={e => setCorteDescricoes(prev => ({ ...prev, [clip.file]: e.target.value }))}
                            placeholder="Legenda e hashtags serão gerados após a análise..."
                            rows={6}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', marginBottom: '10px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5' }}
                          />

                          {/* Botões */}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <a href={`http://localhost:3001${clip.url}`} target="_blank" rel="noreferrer"
                              style={{ padding: '7px 14px', background: '#3b82f6', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>
                              ⬇ Baixar
                            </a>
                            <button onClick={() => publicar(['youtube'])} disabled={isPublishing}
                              style={{ padding: '7px 14px', background: isPublishing ? '#9ca3af' : '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: isPublishing ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                              {isPublishing && cortePublishing === clip.file + 'youtube' ? '⏳...' : '📺 YouTube'}
                            </button>
                            {tiktokConectado && (
                              <button onClick={() => publicar(['tiktok'])} disabled={isPublishing}
                                style={{ padding: '7px 14px', background: isPublishing ? '#9ca3af' : '#010101', color: 'white', border: 'none', borderRadius: '6px', cursor: isPublishing ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                                {isPublishing && cortePublishing === clip.file + 'tiktok' ? '⏳...' : '🎵 TikTok'}
                              </button>
                            )}
                            {tiktokConectado && (
                              <button onClick={() => publicar(['youtube', 'tiktok'])} disabled={isPublishing}
                                style={{ padding: '7px 14px', background: isPublishing ? '#9ca3af' : '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', cursor: isPublishing ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                                {isPublishing && cortePublishing === clip.file + 'youtubetiktok' ? '⏳...' : '🚀 Ambos'}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Cortando — aguardando */}
              {corteJob.status === 'cortando' && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>✂️</div>
                  <p style={{ margin: 0 }}>Cortando clipes com FFmpeg... aguarde</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Aba Reviews de Produtos */}
      {activeTab === 'reviews' && (
        <div className="main-card">
          <h2>⭐ Review de Produto</h2>
          <p style={{ color: '#888', marginBottom: '20px', fontSize: '0.9em' }}>
            Crie vídeos de review profissionais automaticamente. A IA gera o roteiro completo avaliando o produto.
          </p>

          <form onSubmit={async (e) => {
            e.preventDefault()
            if (!reviewForm.nomeProduto.trim()) { alert('Informe o nome do produto'); return }
            setReviewLoading(true)
            try {
              const r = await axios.post(`${API_URL}/videos/review`, reviewForm)
              await carregarVideos()
              setMonitorVideoId(r.data.videoId)
              setMonitorMinimized(false)
              setMonitorVideo(null)
              setActiveTab('videos')
              alert(`✅ Review iniciado! ${r.data.message}`)
            } catch (err) {
              alert('❌ Erro: ' + (err.response?.data?.error || err.message))
            } finally {
              setReviewLoading(false)
            }
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>📦 Nome do Produto *</label>
                <input
                  type="text"
                  value={reviewForm.nomeProduto}
                  onChange={e => setReviewForm(p => ({ ...p, nomeProduto: e.target.value }))}
                  placeholder="Ex: iPhone 16 Pro Max, Air Fryer Mondial..."
                  required
                />
              </div>
              <div className="form-group">
                <label>🏷️ Categoria</label>
                <select value={reviewForm.categoria} onChange={e => setReviewForm(p => ({ ...p, categoria: e.target.value }))}>
                  <option value="tecnologia">📱 Tecnologia</option>
                  <option value="eletrodomesticos">🏠 Eletrodomésticos</option>
                  <option value="beleza">💄 Beleza & Cosméticos</option>
                  <option value="fitness">💪 Fitness & Saúde</option>
                  <option value="games">🎮 Games</option>
                  <option value="automotivo">🚗 Automotivo</option>
                  <option value="livros">📚 Livros & Cursos</option>
                  <option value="alimentos">🍔 Alimentos & Bebidas</option>
                  <option value="moda">👗 Moda & Acessórios</option>
                  <option value="software">💻 Software & Apps</option>
                  <option value="infantil">🧸 Infantil</option>
                  <option value="pets">🐾 Pets</option>
                  <option value="outro">📋 Outro</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>🔗 Link do Produto (opcional)</label>
              <input
                type="text"
                value={reviewForm.linkProduto}
                onChange={e => setReviewForm(p => ({ ...p, linkProduto: e.target.value }))}
                placeholder="https://... (link de afiliado ou página do produto)"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>👍 Pontos Positivos</label>
                <textarea
                  value={reviewForm.pontosPositivos}
                  onChange={e => setReviewForm(p => ({ ...p, pontosPositivos: e.target.value }))}
                  placeholder="Ex: Bateria dura o dia todo, câmera excelente, design premium..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>👎 Pontos Negativos</label>
                <textarea
                  value={reviewForm.pontosNegativos}
                  onChange={e => setReviewForm(p => ({ ...p, pontosNegativos: e.target.value }))}
                  placeholder="Ex: Preço alto, não tem entrada P2, carregador não incluso..."
                  rows={3}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>⭐ Nota Geral (0-10)</label>
                <select value={reviewForm.notaGeral} onChange={e => setReviewForm(p => ({ ...p, notaGeral: e.target.value }))}>
                  {[10,9,8,7,6,5,4,3,2,1,0].map(n => (
                    <option key={n} value={String(n)}>{n}/10 {n >= 9 ? '🔥' : n >= 7 ? '👍' : n >= 5 ? '😐' : '👎'}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>💰 Faixa de Preço</label>
                <input
                  type="text"
                  value={reviewForm.faixaPreco}
                  onChange={e => setReviewForm(p => ({ ...p, faixaPreco: e.target.value }))}
                  placeholder="Ex: R$ 1.299,00"
                />
              </div>
              <div className="form-group">
                <label>🎯 Público-alvo</label>
                <input
                  type="text"
                  value={reviewForm.publicoAlvo}
                  onChange={e => setReviewForm(p => ({ ...p, publicoAlvo: e.target.value }))}
                  placeholder="Ex: Gamers, mães, profissionais..."
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>🎬 Tipo de Vídeo</label>
                <select value={reviewForm.tipoVideo} onChange={e => setReviewForm(p => ({ ...p, tipoVideo: e.target.value }))}>
                  <optgroup label="✅ Gratuitos">
                    <option value="stockImages">📸 Imagens Stock (Pexels)</option>
                    <option value="stockVideos">🎬 Vídeos Stock (Pexels)</option>
                    <option value="darkStickman">🖤 Dark Stickman</option>
                    <option value="geminiVeoGeneration">🎬 Gemini Veo</option>
                  </optgroup>
                  <optgroup label="💳 Pagos">
                    <option value="replicateGeneration">🤖 Replicate</option>
                    <option value="klingGeneration">🎥 Kling AI</option>
                  </optgroup>
                </select>
              </div>
              <div className="form-group">
                <label>⏱️ Duração (minutos)</label>
                <select value={reviewForm.duracao} onChange={e => setReviewForm(p => ({ ...p, duracao: parseInt(e.target.value) }))}>
                  <option value="5">5 min — Review rápido</option>
                  <option value="8">8 min — Review completo</option>
                  <option value="10">10 min — Review detalhado</option>
                  <option value="15">15 min — Review aprofundado</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9em' }}>
                <input
                  type="checkbox"
                  checked={reviewForm.legendas}
                  onChange={e => setReviewForm(p => ({ ...p, legendas: e.target.checked }))}
                  style={{ width: 'auto' }}
                />
                💬 Legendas automáticas
              </label>
              {reviewForm.legendas && (
                <select value={reviewForm.estiloLegenda} onChange={e => setReviewForm(p => ({ ...p, estiloLegenda: e.target.value }))} style={{ fontSize: '0.85em' }}>
                  <option value="classic">📝 Clássico</option>
                  <option value="bold">💪 Bold</option>
                  <option value="neon">💜 Neon</option>
                  <option value="cinematic">🎬 Cinematográfico</option>
                </select>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9em' }}>
                <input
                  type="checkbox"
                  checked={reviewForm.publicarYoutube}
                  onChange={e => setReviewForm(p => ({ ...p, publicarYoutube: e.target.checked }))}
                  disabled={!config.youtube_connected}
                  style={{ width: 'auto' }}
                />
                📺 Publicar no YouTube
              </label>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary" disabled={reviewLoading} style={{ flex: 1 }}>
                {reviewLoading ? '⏳ Gerando review...' : '⭐ Gerar Vídeo de Review'}
              </button>
            </div>

            <div style={{ marginTop: '16px', padding: '12px 16px', background: '#f0f7ff', borderRadius: '8px', fontSize: '12px', color: '#555' }}>
              <strong>💡 Como funciona:</strong>
              <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.8' }}>
                <li>A IA analisa o produto e gera um roteiro de review profissional</li>
                <li>Estrutura: abertura → apresentação → prós → contras → veredito final</li>
                <li>Imagens/vídeos são buscados automaticamente no Pexels</li>
                <li>Narração com TTS + legendas opcionais</li>
                <li>Resultado: vídeo pronto para publicar!</li>
              </ol>
            </div>
          </form>
        </div>
      )}

      {/* Aba Tutoriais / Documentação */}
      {activeTab === 'docs' && <DocsTab />}

      {/* Aba Timeline Editor */}
      {activeTab === 'timeline' && <TimelineEditor token={localStorage.getItem('token')} />}

    </>
  )
}

export default App
