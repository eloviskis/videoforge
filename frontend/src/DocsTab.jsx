import { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// DADOS DAS APIs
// ─────────────────────────────────────────────────────────────────────────────
const APIS = [
  // ── LLM / IA ───────────────────────────────────────────────────────────────
  {
    id: 'gemini',
    categoria: 'IA / LLM',
    nome: 'Google Gemini',
    icon: '✨',
    env: 'GEMINI_API_KEY',
    plano: 'gratis',
    planoBadge: '🟢 Grátis (com cota)',
    descricao: 'Modelo de IA do Google usado para gerar roteiros e resumos de notícias. Cota gratuita generosa no plano Flash.',
    link: 'https://aistudio.google.com/app/apikey',
    passos: [
      'Acesse https://aistudio.google.com/app/apikey',
      'Faça login com sua conta Google',
      'Clique em "Create API key"',
      'Selecione ou crie um projeto Google Cloud',
      'Copie a chave gerada (começa com AIza...)',
      'Cole no campo GEMINI_API_KEY em ⚙️ Minha Conta → Minhas API Keys',
    ],
    limites: 'Grátis: 15 req/min, 1.500 req/dia no Gemini 1.5 Flash. Pago a partir de US$0,075/1M tokens.',
  },
  {
    id: 'openrouter',
    categoria: 'IA / LLM',
    nome: 'OpenRouter',
    icon: '🔀',
    env: 'OPENROUTER_API_KEY',
    plano: 'pago',
    planoBadge: '🟡 Pago (muitos modelos grátis)',
    descricao: 'Gateway para dezenas de LLMs (GPT-4, Claude, Llama, Mistral). Vários modelos têm cota gratuita.',
    link: 'https://openrouter.ai/keys',
    passos: [
      'Acesse https://openrouter.ai e crie uma conta',
      'Vá em Keys → Create Key',
      'Copie a chave (começa com sk-or-...)',
      'Cole no campo OPENROUTER_API_KEY em ⚙️ Minha Conta → Minhas API Keys',
      'Modelos gratuitos: meta-llama/llama-3-8b-instruct, mistralai/mistral-7b-instruct',
    ],
    limites: 'Gratuito para modelos com ":free". Créditos a partir de US$5.',
  },
  {
    id: 'openai',
    categoria: 'IA / LLM',
    nome: 'OpenAI (GPT)',
    icon: '🤖',
    env: 'OPENAI_API_KEY',
    plano: 'pago',
    planoBadge: '🔴 Pago',
    descricao: 'GPT-4o e GPT-3.5 para roteiros e narração. Necessário crédito pré-pago.',
    link: 'https://platform.openai.com/api-keys',
    passos: [
      'Acesse https://platform.openai.com e crie conta',
      'Vá em API Keys → Create new secret key',
      'Adicione créditos em Billing (mínimo US$5)',
      'Copie a chave (sk-proj-...)',
      'Cole no campo OPENAI_API_KEY em ⚙️ Minha Conta → Minhas API Keys',
    ],
    limites: 'GPT-4o: ~US$0,005/1K tokens. Sem plano grátis (somente trial inicial).',
  },
  {
    id: 'pollinations',
    categoria: 'IA / LLM',
    nome: 'Pollinations.ai',
    icon: '🌸',
    env: '(automático)',
    plano: 'gratis',
    planoBadge: '🟢 100% Grátis',
    descricao: 'Fallback automático do VideoForge quando Gemini atinge cota. Sem necessidade de chave.',
    link: 'https://pollinations.ai',
    passos: [
      'Nenhuma configuração necessária!',
      'O VideoForge usa automaticamente como fallback',
      'Modelos disponíveis: openai, mistral, llama',
    ],
    limites: 'Sem limites documentados. Latência pode ser maior.',
  },

  // ── IMAGENS / VÍDEOS ────────────────────────────────────────────────────────
  {
    id: 'pexels',
    categoria: 'Imagens / Vídeos',
    nome: 'Pexels',
    icon: '📸',
    env: 'PEXELS_API_KEY',
    plano: 'gratis',
    planoBadge: '🟢 Grátis',
    descricao: 'Banco de fotos e vídeos gratuitos de alta qualidade. Usado para imagens de fundo nos vídeos de notícias.',
    link: 'https://www.pexels.com/api/',
    passos: [
      'Acesse https://www.pexels.com/api/',
      'Clique em "Get Started"',
      'Crie uma conta gratuita',
      'Preencha o formulário (nome do app: VideoForge)',
      'Sua chave aparecerá no painel',
      'Cole no campo PEXELS_API_KEY em ⚙️ Minha Conta → Minhas API Keys',
    ],
    limites: 'Grátis: 200 req/hora, 20.000 req/mês.',
  },
  {
    id: 'pixabay',
    categoria: 'Imagens / Vídeos',
    nome: 'Pixabay',
    icon: '🎨',
    env: 'PIXABAY_API_KEY',
    plano: 'gratis',
    planoBadge: '🟢 Grátis',
    descricao: 'Outro banco de imagens e vídeos gratuitos. Complementa o Pexels para busca de visuais.',
    link: 'https://pixabay.com/api/docs/',
    passos: [
      'Acesse https://pixabay.com e crie uma conta',
      'Vá em https://pixabay.com/api/docs/',
      'Faça login — a chave aparece automaticamente na página',
      'Cole no campo PIXABAY_API_KEY em ⚙️ Minha Conta → Minhas API Keys',
    ],
    limites: 'Grátis: 100 req/min.',
  },
  {
    id: 'huggingface',
    categoria: 'Imagens / Vídeos',
    nome: 'Hugging Face',
    icon: '🤗',
    env: 'HUGGINGFACE_API_TOKEN',
    plano: 'freemium',
    planoBadge: '🟡 Freemium',
    descricao: 'Geração de imagens via Stable Diffusion e outros modelos. Usado para criar imagens de cenas.',
    link: 'https://huggingface.co/settings/tokens',
    passos: [
      'Acesse https://huggingface.co e crie uma conta',
      'Vá em Settings → Access Tokens',
      'Clique em "New token"',
      'Tipo: Read',
      'Copie o token (hf_...)',
      'Cole no campo HUGGINGFACE_API_TOKEN em ⚙️ Minha Conta → Minhas API Keys',
    ],
    limites: 'Grátis: modelos públicos com cold start. PRO (US$9/mês) dá prioridade e GPU dedicada.',
  },
  {
    id: 'replicate',
    categoria: 'Imagens / Vídeos',
    nome: 'Replicate',
    icon: '🔁',
    env: 'REPLICATE_API_TOKEN',
    plano: 'pago',
    planoBadge: '🔴 Pago (pay-per-use)',
    descricao: 'Run de modelos de IA como Stable Diffusion, SDXL, Flux. Pay-per-use sem assinatura.',
    link: 'https://replicate.com/account/api-tokens',
    passos: [
      'Acesse https://replicate.com e crie conta',
      'Vá em Account → API Tokens',
      'Crie um novo token',
      'Adicione créditos em Billing (mínimo US$5)',
      'Cole no campo REPLICATE_API_TOKEN em ⚙️ Minha Conta → Minhas API Keys',
    ],
    limites: '~US$0,0055/img para SDXL. Sem mensalidade, paga pelo uso.',
  },
  {
    id: 'kling',
    categoria: 'Imagens / Vídeos',
    nome: 'Kling AI (Vídeo)',
    icon: '🎬',
    env: 'KLING_ACCESS_KEY_ID + KLING_ACCESS_KEY_SECRET',
    plano: 'pago',
    planoBadge: '🔴 Pago',
    descricao: 'Geração de vídeos com IA da Kuaishou. Cria clipes cinematográficos a partir de prompt.',
    link: 'https://klingai.com/dev',
    passos: [
      'Acesse https://klingai.com/dev',
      'Crie uma conta de desenvolvedor',
      'Vá em API Management → Create API Key',
      'Copie o Access Key ID e Access Key Secret',
      'Cole nos campos correspondentes em ⚙️ Minha Conta → Minhas API Keys',
    ],
    limites: 'Plano gratuito: 66 créditos grátis. Pago a partir de US$14/mês.',
  },
  {
    id: 'did',
    categoria: 'Imagens / Vídeos',
    nome: 'D-ID (Avatar)',
    icon: '👤',
    env: 'DID_API_KEY',
    plano: 'pago',
    planoBadge: '🔴 Pago (trial grátis)',
    descricao: 'Cria avatares falantes com IA. Pode animar fotos com narração.',
    link: 'https://studio.d-id.com/account-settings',
    passos: [
      'Acesse https://studio.d-id.com e crie conta',
      'Vá em Account Settings → API',
      'Copie a API Key (Basic ...)',
      'Cole no campo DID_API_KEY em ⚙️ Minha Conta → Minhas API Keys',
    ],
    limites: 'Trial: 20 créditos grátis. Pago: US$5,90/mês (10 min de vídeo).',
  },

  // ── TTS ─────────────────────────────────────────────────────────────────────
  {
    id: 'elevenlabs',
    categoria: 'Text-to-Speech',
    nome: 'ElevenLabs',
    icon: '🎙️',
    env: 'ELEVENLABS_API_KEY',
    plano: 'freemium',
    planoBadge: '🟡 Freemium',
    descricao: 'Vozes ultra-realistas. Plano gratuito dá 10 min/mês. Opcional — o VideoForge usa Edge TTS por padrão.',
    link: 'https://elevenlabs.io/app/settings/api-keys',
    passos: [
      'Acesse https://elevenlabs.io e crie conta',
      'Vá em Profile → API Key',
      'Copie a chave',
      'Cole no campo ELEVENLABS_API_KEY em ⚙️ Minha Conta → Minhas API Keys',
    ],
    limites: 'Grátis: 10 min/mês. Creator (US$22/mês): 100 min. Edge TTS é grátis e não precisa de chave.',
  },

  // ── YOUTUBE / REDES ─────────────────────────────────────────────────────────
  {
    id: 'youtube',
    categoria: 'YouTube / Redes Sociais',
    nome: 'YouTube (OAuth)',
    icon: '📺',
    env: 'YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET',
    plano: 'gratis',
    planoBadge: '🟢 Grátis',
    descricao: 'Publicação automática de vídeos no YouTube via OAuth2. Usa a YouTube Data API v3.',
    link: 'https://console.cloud.google.com/apis/credentials',
    passos: [
      '1. Acesse https://console.cloud.google.com',
      '2. Crie um projeto ou selecione existente',
      '3. Vá em "APIs e serviços" → "Ativar APIs"',
      '4. Busque e ative "YouTube Data API v3"',
      '5. Vá em "Credenciais" → "Criar credenciais" → "ID do cliente OAuth 2.0"',
      '6. Tipo: Aplicativo Web',
      '7. Em "URIs de redirecionamento autorizados" adicione:',
      '   → https://videoforge.tech/api/youtube/callback',
      '   → http://localhost:3001/api/youtube/callback (local)',
      '8. Baixe o JSON ou copie Client ID e Client Secret',
      '9. Cole nos campos em ⚙️ Minha Conta → Minhas API Keys (grupo YouTube)',
    ],
    limites: 'Grátis: 10.000 unidades/dia (1 upload = 1.600 unidades, ~6 uploads/dia). Aumento via pedido.',
    destaque: 'autCliInstructions',
  },
  {
    id: 'twitter',
    categoria: 'YouTube / Redes Sociais',
    nome: 'X/Twitter',
    icon: '🐦',
    env: 'TWITTER_CLIENT_ID + TWITTER_CLIENT_SECRET + TWITTER_BEARER_TOKEN',
    plano: 'freemium',
    planoBadge: '🟡 Freemium (plano Basic)',
    descricao: 'Publicação de tweets com vídeo. Requer conta de desenvolvedor aprovada.',
    link: 'https://developer.twitter.com/en/portal/dashboard',
    passos: [
      'Acesse https://developer.twitter.com e solicite acesso',
      'Crie um Project e um App dentro dele',
      'Vá em "Keys and Tokens"',
      'Copie: API Key (Client ID), API Secret (Client Secret) e Bearer Token',
      'Em "User authentication settings" ative OAuth 2.0',
      'Redirect URI: https://videoforge.tech/api/social/twitter/callback',
      'Cole os campos em ⚙️ Minha Conta → Minhas API Keys',
    ],
    limites: 'Free tier: apenas leitura. Para postar vídeo: plano Basic (US$100/mês) ou Pro.',
  },
  {
    id: 'tiktok',
    categoria: 'YouTube / Redes Sociais',
    nome: 'TikTok',
    icon: '🎵',
    env: 'TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET',
    plano: 'gratis',
    planoBadge: '🟢 Grátis',
    descricao: 'Publicação de vídeos no TikTok via TikTok for Developers.',
    link: 'https://developers.tiktok.com/apps/',
    passos: [
      'Acesse https://developers.tiktok.com e crie conta',
      'Crie um novo App em "Manage Apps"',
      'Produtos: ative "Login Kit" e "Video Kit"',
      'Scope: video.upload',
      'Redirect URI: https://videoforge.tech/api/social/tiktok/callback',
      'Copie Client Key e Client Secret',
      'Cole os campos em ⚙️ Minha Conta → Minhas API Keys',
    ],
    limites: 'Grátis. Mas em sandbox: só usuários cadastrados no app conseguem postar.',
  },
  {
    id: 'facebook',
    categoria: 'YouTube / Redes Sociais',
    nome: 'Facebook / Instagram',
    icon: '👍',
    env: 'FACEBOOK_APP_ID + FACEBOOK_APP_SECRET',
    plano: 'gratis',
    planoBadge: '🟢 Grátis',
    descricao: 'Publicação em páginas do Facebook e perfis profissionais do Instagram via Graph API.',
    link: 'https://developers.facebook.com/apps/',
    passos: [
      'Acesse https://developers.facebook.com e crie uma conta',
      'Crie um App → Tipo: Business',
      'Adicione produto "Instagram Graph API" e "Pages API"',
      'Vá em Configurações → Básico',
      'Copie App ID e App Secret',
      'Em "Login do Facebook" configure Redirect URI:',
      '   → https://videoforge.tech/api/social/facebook/callback',
      'Cole os campos em ⚙️ Minha Conta → Minhas API Keys',
    ],
    limites: 'Grátis. Requer revisão do app para publicar para todos (em dev: só admins do app).',
  },
]

const CATEGORIAS = [...new Set(APIS.map(a => a.categoria))]

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: Card de API
// ─────────────────────────────────────────────────────────────────────────────
function ApiCard({ api }) {
  const [aberto, setAberto] = useState(false)
  const corBadge = {
    gratis: '#166534',
    freemium: '#92400e',
    pago: '#991b1b',
  }[api.plano] || '#374151'

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Cabeçalho do card */}
      <button
        onClick={() => setAberto(a => !a)}
        style={{
          width: '100%', textAlign: 'left', padding: '16px 20px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}
      >
        <span style={{ fontSize: '28px' }}>{api.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '15px', color: '#111827' }}>{api.nome}</strong>
            <span style={{
              padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700,
              background: corBadge, color: '#fff',
            }}>{api.planoBadge}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
            <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>
              {api.env}
            </code>
          </div>
        </div>
        <span style={{ color: '#9ca3af', fontSize: '20px', flexShrink: 0 }}>
          {aberto ? '▲' : '▼'}
        </span>
      </button>

      {/* Conteúdo expansível */}
      {aberto && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f3f4f6' }}>
          <p style={{ color: '#374151', fontSize: '14px', margin: '14px 0 12px' }}>
            {api.descricao}
          </p>

          {/* Passos */}
          <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
            <strong style={{ fontSize: '13px', color: '#374151', marginBottom: '8px', display: 'block' }}>
              📋 Como obter a chave:
            </strong>
            <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#374151', lineHeight: '1.8' }}>
              {api.passos.map((p, i) => (
                <li key={i} style={{ marginBottom: '2px' }}>{p}</li>
              ))}
            </ol>
          </div>

          {/* Limites */}
          {api.limites && (
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a',
              borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: '#92400e',
            }}>
              ⚠️ <strong>Limites / Preços:</strong> {api.limites}
            </div>
          )}

          {/* Link */}
          <a
            href={api.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block', padding: '8px 16px',
              background: '#8b5cf6', color: '#fff', borderRadius: '8px',
              textDecoration: 'none', fontSize: '13px', fontWeight: 600,
            }}
          >
            🔗 {api.link.replace('https://', '').split('/')[0]}
          </a>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO: Auth YouTube via URL direta (sem redirect para localhost)
// ─────────────────────────────────────────────────────────────────────────────
function YoutubeCliAuth() {
  const [etapa, setEtapa] = useState(0) // 0=idle 1=loading 2=url 3=aguardando 4=ok 5=erro
  const [authUrl, setAuthUrl] = useState('')
  const [msg, setMsg] = useState('')
  const API = window.location.hostname === 'localhost' ? 'http://localhost:3001' : ''
  const pollRef = useRef(null)

  async function gerarUrl() {
    setEtapa(1)
    try {
      const r = await fetch(`${API}/api/youtube/auth`)
      const d = await r.json()
      const url = d.authUrl || d.url
      if (url) {
        setAuthUrl(url)
        setEtapa(2)
      } else {
        setMsg(d.error || 'Configure YOUTUBE_CLIENT_ID e CLIENT_SECRET primeiro')
        setEtapa(5)
      }
    } catch (e) { setMsg(e.message); setEtapa(5) }
  }

  function abrirEAguardar() {
    window.open(authUrl, '_blank')
    setEtapa(3)
    // Polling: verifica a cada 3s se o token foi salvo
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/youtube/status`)
        const d = await r.json()
        if (d.connected) {
          clearInterval(pollRef.current)
          setEtapa(4)
        }
      } catch (_) {}
    }, 3000)
  }

  // Limpa polling ao desmontar
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  return (
    <div style={{
      background: '#f0fdf4', border: '1px solid #86efac',
      borderRadius: '12px', padding: '20px', marginTop: '16px',
    }}>
      <h4 style={{ margin: '0 0 8px', color: '#166534' }}>
        🖥️ Autenticar YouTube diretamente pelo navegador
      </h4>
      <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#374151' }}>
        Gera a URL de autorização Google, você abre no navegador, concede permissão
        e o VPS captura automaticamente o token de acesso.
      </p>

      {/* Pré-requisito: URI cadastrada no Google Cloud */}
      <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#78350f' }}>
        ⚠️ <strong>Pré-requisito:</strong> Adicione a URI abaixo no Google Cloud Console em<br/>
        <em>Credenciais → OAuth → URIs de redirecionamento autorizados:</em><br/>
        <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
          {window.location.origin}/api/youtube/callback
        </code>
      </div>

      {etapa === 0 && (
        <button onClick={gerarUrl}
          style={{ padding: '9px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
          Gerar URL de autorização
        </button>
      )}

      {etapa === 1 && <p style={{ color: '#6b7280', fontSize: '13px' }}>⏳ Gerando URL...</p>}

      {etapa === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#fff', border: '1px solid #d1fae5', borderRadius: '8px', padding: '10px 14px', wordBreak: 'break-all', fontSize: '11px', fontFamily: 'monospace', color: '#065f46' }}>
            {authUrl}
          </div>
          <button onClick={abrirEAguardar}
            style={{ alignSelf: 'flex-start', padding: '9px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>
            🔗 Abrir no Google e aguardar autorização
          </button>
        </div>
      )}

      {etapa === 3 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#92400e' }}>
          <span style={{ fontSize: '20px', animation: 'spin 1s linear infinite' }}>⏳</span>
          <div>
            <strong>Aguardando você autorizar no Google...</strong><br/>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>A janela do Google deve ter aberto. Após conceder acesso, esta página detecta automaticamente.</span>
          </div>
        </div>
      )}

      {etapa === 4 && (
        <div style={{ background: '#dcfce7', borderRadius: '8px', padding: '12px 16px', color: '#166534', fontWeight: 700 }}>
          ✅ YouTube autenticado com sucesso! Já pode publicar vídeos.
        </div>
      )}

      {etapa === 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ background: '#fee2e2', borderRadius: '8px', padding: '12px 16px', color: '#991b1b', fontSize: '13px' }}>
            ❌ {msg}
          </div>
          <button onClick={() => { setEtapa(0); setAuthUrl('') }}
            style={{ alignSelf: 'flex-start', padding: '7px 14px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: Card de Tutorial
// ─────────────────────────────────────────────────────────────────────────────
function TutorialCard({ tutorial }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden',
      background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <button
        onClick={() => setAberto(a => !a)}
        style={{
          width: '100%', textAlign: 'left', padding: '16px 20px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '15px', color: '#111827' }}>{tutorial.titulo}</strong>
            <span style={{
              padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700,
              background: tutorial.badgeColor, color: '#fff',
            }}>{tutorial.badge}</span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>{tutorial.desc}</p>
        </div>
        <span style={{ fontSize: '18px', color: '#9ca3af', transition: 'transform 0.2s', transform: aberto ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
      </button>
      {aberto && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f3f4f6' }}>
          <ol style={{ margin: '16px 0 0', paddingLeft: '20px', fontSize: '13px', color: '#374151', lineHeight: 2 }}>
            {tutorial.passos.map((p, i) => <li key={i}>{p}</li>)}
          </ol>
          {tutorial.requisito && (
            <div style={{
              marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
              background: '#fefce8', border: '1px solid #fde68a', fontSize: '12px', color: '#78350f',
            }}>
              ⚠️ <strong>Requisito:</strong> {tutorial.requisito}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function DocsTab() {
  const [catAtiva, setCatAtiva] = useState('Todas')
  const [busca, setBusca] = useState('')

  const apisFiltradas = APIS.filter(a => {
    const matchCat = catAtiva === 'Todas' || a.categoria === catAtiva
    const matchBusca = !busca || a.nome.toLowerCase().includes(busca.toLowerCase()) ||
      a.env.toLowerCase().includes(busca.toLowerCase())
    return matchCat && matchBusca
  })

  // Resumo de custo
  const nGratis = APIS.filter(a => a.plano === 'gratis').length
  const nFreemium = APIS.filter(a => a.plano === 'freemium').length
  const nPago = APIS.filter(a => a.plano === 'pago').length

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 0 40px' }}>
      {/* Header */}
      <div className="main-card" style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 6px' }}>📚 Tutoriais & Documentação de APIs</h2>
        <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: '14px' }}>
          Guia completo para configurar cada integração do VideoForge.
        </p>

        {/* Destaque Minha Conta */}
        <div style={{
          background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '10px',
          padding: '14px 18px', marginBottom: '16px',
        }}>
          <strong style={{ fontSize: '14px', color: '#4338ca' }}>💡 Onde configurar suas chaves?</strong>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#4338ca', lineHeight: 1.6 }}>
            Clique em <strong>⚙️ Minha Conta</strong> na barra superior para acessar o painel de configuração pessoal.
            Lá você pode adicionar suas próprias API keys e conectar suas redes sociais.
            Suas chaves são privadas e usadas apenas nos seus vídeos.
          </p>
        </div>

        {/* Resumo badges */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '0' }}>
          <span style={{ padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, background: '#166534', color: '#fff' }}>
            🟢 {nGratis} Grátis
          </span>
          <span style={{ padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, background: '#92400e', color: '#fff' }}>
            🟡 {nFreemium} Freemium
          </span>
          <span style={{ padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, background: '#991b1b', color: '#fff' }}>
            🔴 {nPago} Pagas
          </span>
        </div>
      </div>

      {/* ═══════════════ TUTORIAIS DAS FUNCIONALIDADES ═══════════════ */}
      <div className="main-card" style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '18px' }}>🎓 Tutoriais — Como Usar as Funcionalidades</h3>
        <p style={{ color: '#6b7280', margin: '0 0 20px', fontSize: '13px' }}>
          Passo a passo de cada recurso do VideoForge.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            {
              titulo: '🎤 Clonagem de Voz',
              desc: 'Clone qualquer voz a partir de um áudio MP3 e use-a na narração dos seus vídeos.',
              passos: [
                'Vá na aba "Criar Vídeo" e role até "Biblioteca de Vozes Clonadas"',
                'Clique para expandir e preencha: nome da voz, descrição, idioma e gênero',
                'Faça upload de um áudio MP3/WAV de 30s a 5min da voz que deseja clonar',
                'Clique em "Clonar Voz" — o processo leva alguns segundos',
                'Quando o status mudar para ✅, a voz está pronta para uso',
                'No campo "Voz da Narração", selecione sua voz clonada no grupo "🎤 Minhas Vozes Clonadas"',
                'Crie o vídeo normalmente — a narração será gerada com a voz clonada!',
              ],
              requisito: 'Requer chave ELEVENLABS_API_KEY configurada em ⚙️ Minha Conta',
              badge: '🟡 Requer ElevenLabs',
              badgeColor: '#92400e',
            },
            {
              titulo: '🎭 D-ID Avatar Apresentador',
              desc: 'Gere vídeos com um avatar realista que "fala" a narração — perfeito para reviews e apresentações.',
              passos: [
                'Na criação de vídeo (normal ou review), selecione o tipo "🎭 D-ID Avatar Apresentador"',
                'Preencha os campos normalmente (tema, nicho, duração, etc.)',
                'O sistema vai gerar o roteiro, narração e enviar para o D-ID criar o avatar falando',
                'O vídeo final mostra o avatar apresentando o conteúdo',
                'Tempo de geração: 2-10 minutos dependendo da duração',
              ],
              requisito: 'Requer DID_API_KEY e DID_PRESENTER_URL configuradas em ⚙️ Minha Conta',
              badge: '🔴 Pago (D-ID)',
              badgeColor: '#991b1b',
            },
            {
              titulo: '⭐ Review de Produto',
              desc: 'Crie vídeos de review profissionais com prós, contras, nota e veredicto — ideal para afiliados.',
              passos: [
                'Acesse a aba "Review de Produto" no menu superior',
                'Preencha: nome do produto, categoria, pontos positivos e negativos',
                'Defina a nota geral (1 a 10), público-alvo e faixa de preço',
                'Escolha o tipo de vídeo (Stock Images, Stock Videos, D-ID Avatar, etc.)',
                'Selecione duração, voz e tom (profissional, casual, entusiasmado, etc.)',
                'Clique em "Gerar Review" — o sistema cria roteiro, narração e renderiza',
                'O vídeo final inclui: introdução, análise, prós/contras, nota e veredicto',
              ],
              requisito: 'Funciona com APIs gratuitas (Gemini + Pexels). Para avatar, precisa D-ID.',
              badge: '🟢 Grátis (modo básico)',
              badgeColor: '#166534',
            },
            {
              titulo: '🖤 Dark Stickman Animation',
              desc: 'Crie vídeos no estilo "história sombria" com animação de palitinhos — 100% offline, sem APIs.',
              passos: [
                'Na criação de vídeo, selecione o tipo "🖤 Dark Stickman"',
                'Digite o tema da história (ex: "O Mistério da Floresta", "A Casa Abandonada")',
                'O roteiro é gerado offline (zero tokens!) com temas de mistério e terror',
                'A animação usa palitinhos desenhados com cenas em preto e branco',
                'A narração usa Edge TTS (grátis) com voz sombria',
                'Ideal para canais de histórias de terror e mistério',
              ],
              requisito: 'Nenhuma API necessária! Funciona 100% offline.',
              badge: '🟢 100% Grátis',
              badgeColor: '#166534',
            },
            {
              titulo: '📺 Publicação Multi-Plataforma',
              desc: 'Publique seus vídeos automaticamente no YouTube, TikTok, Instagram e Twitter.',
              passos: [
                'Configure suas redes sociais em ⚙️ Minha Conta → API Keys',
                'YouTube: clique "Autenticar YouTube" na aba Tutoriais (abaixo)',
                'Ao criar um vídeo, marque "Publicar no YouTube" antes de gerar',
                'Para TikTok/Instagram/Twitter: configure as chaves na aba Minha Conta',
                'Após o vídeo ficar pronto, use os botões de compartilhamento no card do vídeo',
              ],
              requisito: 'YouTube (grátis com OAuth). TikTok/Instagram/Twitter requerem apps de desenvolvedor.',
              badge: '🟢 YouTube Grátis',
              badgeColor: '#166534',
            },
            {
              titulo: '🎬 Modos de Geração de Vídeo',
              desc: 'Entenda os diferentes modos de vídeo disponíveis e quando usar cada um.',
              passos: [
                '📸 Stock Images (Pexels) — Grátis. Usa fotos do Pexels de fundo. Bom para canais de curiosidades.',
                '🎬 Stock Videos (Pexels) — Grátis. Usa vídeos do Pexels. Melhor qualidade que fotos.',
                '🖤 Dark Stickman — Grátis. Animação de palitinhos offline. Para canais de terror.',
                '🎭 D-ID Avatar — Pago. Avatar realista falando. Para canais profissionais.',
                '🎬 Gemini Veo — Google Vertex AI. Alta qualidade de vídeo gerado por IA.',
                '🤖 Replicate — Pago. Wan 2.1 model. Vídeos com IA generativa.',
                '🎥 Kling AI — Pago. Geração realista chinesa. Estilo cinematográfico.',
              ],
              requisito: 'Modos gratuitos: Stock Images, Stock Videos, Dark Stickman. Outros requerem APIs pagas.',
              badge: '🟢 3 Grátis + 4 Pagos',
              badgeColor: '#166534',
            },
            {
              titulo: '💬 Legendas Automáticas',
              desc: 'Adicione legendas automáticas geradas pelo Whisper em qualquer vídeo.',
              passos: [
                'Ao criar um vídeo, a opção "Legendas" já vem ativada por padrão',
                'Escolha o estilo: Classic (branco), Neon (colorido), Minimal (sutil)',
                'O sistema usa Whisper (IA de transcrição) para gerar as legendas automaticamente',
                'As legendas são sincronizadas com o áudio e queimadas no vídeo final',
                'Para desativar, desmarque "Legendas" antes de gerar o vídeo',
              ],
              requisito: 'Grátis! Usa Whisper via Docker.',
              badge: '🟢 Grátis',
              badgeColor: '#166534',
            },
          ].map((tut, i) => (
            <TutorialCard key={i} tutorial={tut} />
          ))}
        </div>
      </div>

      {/* Auth YouTube CLI (destaque no topo) */}
      <div className="main-card" style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 4px' }}>📺 Autenticação YouTube</h3>
        <p style={{ color: '#6b7280', margin: '0', fontSize: '13px' }}>
          Se configurar o YouTube na aba de Configurações não funcionar por causa do redirect,
          use o método abaixo diretamente pelo navegador sem precisar de callback:
        </p>
        <YoutubeCliAuth />
      </div>

      {/* Stack mínimo recomendado */}
      <div className="main-card" style={{ marginBottom: '24px', background: '#fafafa' }}>
        <h3 style={{ margin: '0 0 12px' }}>⭐ Stack mínimo gratuito para começar</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {[
            { nome: 'Gemini', motivo: 'Roteiros e resumos de notícias', icon: '✨' },
            { nome: 'Pexels', motivo: 'Imagens de fundo gratuitas', icon: '📸' },
            { nome: 'Pixabay', motivo: 'Imagens extras gratuitas', icon: '🎨' },
            { nome: 'Hugging Face', motivo: 'Geração de imagens (grátis)', icon: '🤗' },
            { nome: 'YouTube OAuth', motivo: 'Publicar vídeos', icon: '📺' },
          ].map(item => (
            <div key={item.nome} style={{
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
              padding: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '22px' }}>{item.icon}</span>
              <div>
                <strong style={{ fontSize: '13px', color: '#111827' }}>{item.nome}</strong>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{item.motivo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="🔍 Buscar API..."
          style={{
            padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db',
            fontSize: '13px', minWidth: '200px', outline: 'none',
          }}
        />
        {['Todas', ...CATEGORIAS].map(c => (
          <button key={c}
            onClick={() => setCatAtiva(c)}
            style={{
              padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600,
              background: catAtiva === c ? '#8b5cf6' : '#f3f4f6',
              color: catAtiva === c ? '#fff' : '#374151',
            }}>
            {c}
          </button>
        ))}
      </div>

      {/* Cards de API agrupados por categoria */}
      {CATEGORIAS.filter(c => catAtiva === 'Todas' || catAtiva === c).map(cat => {
        const apisNaCat = apisFiltradas.filter(a => a.categoria === cat)
        if (apisNaCat.length === 0) return null
        return (
          <div key={cat} style={{ marginBottom: '28px' }}>
            <h3 style={{ margin: '0 0 12px', color: '#374151', fontSize: '16px', fontWeight: 700 }}>
              {cat}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {apisNaCat.map(api => <ApiCard key={api.id} api={api} />)}
            </div>
          </div>
        )
      })}

      {apisFiltradas.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
          Nenhuma API encontrada para "{busca}"
        </div>
      )}
    </div>
  )
}
