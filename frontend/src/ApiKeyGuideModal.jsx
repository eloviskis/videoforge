import { useState } from 'react'

/* ═══════════════════════════════════════════════════════════════
   Modal Guia Passo-a-Passo — Como configurar cada API Key
   ═══════════════════════════════════════════════════════════════ */

const GUIDES = {
  GEMINI_API_KEY: {
    title: 'Google Gemini',
    icon: '🧠',
    free: true,
    color: '#4285f4',
    estimatedTime: '2 min',
    steps: [
      { title: 'Acesse o Google AI Studio', desc: 'Entre no site do Google AI Studio com sua conta Google.', link: 'https://aistudio.google.com/apikey', linkLabel: 'Abrir Google AI Studio' },
      { title: 'Clique em "Create API Key"', desc: 'Na página de API Keys, clique no botão azul "Create API Key" (Criar Chave de API).' },
      { title: 'Selecione um projeto', desc: 'Escolha um projeto existente ou crie um novo projeto do Google Cloud. Se não tiver nenhum, clique em "Create project".' },
      { title: 'Copie sua chave', desc: 'A chave será exibida na tela (começa com "AIza..."). Clique no ícone de copiar.' },
      { title: 'Cole no VideoForge', desc: 'Volte ao VideoForge, cole a chave no campo "Google Gemini" e clique em Salvar.' },
    ],
    tips: ['A API do Gemini é 100% gratuita com limites generosos.', 'Você pode criar múltiplas chaves se precisar.', 'Não compartilhe sua chave com ninguém.'],
  },

  PEXELS_API_KEY: {
    title: 'Pexels (Imagens)',
    icon: '🖼️',
    free: true,
    color: '#05a081',
    estimatedTime: '3 min',
    steps: [
      { title: 'Crie uma conta Pexels', desc: 'Acesse o site da Pexels e crie uma conta gratuita (pode usar Google ou email).', link: 'https://www.pexels.com/onboarding', linkLabel: 'Criar conta Pexels' },
      { title: 'Acesse a página de API', desc: 'Depois de logado, vá para a página de API da Pexels.', link: 'https://www.pexels.com/api/', linkLabel: 'Página da API Pexels' },
      { title: 'Clique em "Your API Key"', desc: 'Clique no botão para solicitar sua API Key. Preencha uma breve descrição (ex: "VideoForge - geração de vídeos").' },
      { title: 'Copie a chave', desc: 'Sua API Key será exibida na tela. Copie-a.' },
      { title: 'Cole no VideoForge', desc: 'Volte ao VideoForge, cole a chave no campo "Pexels" e clique em Salvar.' },
    ],
    tips: ['A API do Pexels é gratuita, com limite de 200 requisições/hora.', 'As fotos são livres de direitos autorais.'],
  },

  OPENAI_API_KEY: {
    title: 'OpenAI (GPT + DALL-E + TTS)',
    icon: '🤖',
    free: false,
    color: '#10a37f',
    estimatedTime: '5 min',
    pricing: '~$0.002/1K tokens (GPT-4o-mini), TTS ~$0.015/1K chars',
    steps: [
      { title: 'Crie uma conta OpenAI', desc: 'Acesse a plataforma OpenAI e crie sua conta.', link: 'https://platform.openai.com/signup', linkLabel: 'Criar conta OpenAI' },
      { title: 'Adicione créditos', desc: 'Vá em Billing → Add payment method. Adicione um cartão e compre créditos (mínimo $5). Só é cobrado pelo que usar.', link: 'https://platform.openai.com/account/billing', linkLabel: 'Página de Billing' },
      { title: 'Crie uma API Key', desc: 'Vá em API Keys e clique em "Create new secret key". Dê um nome (ex: "VideoForge").', link: 'https://platform.openai.com/api-keys', linkLabel: 'Criar API Key' },
      { title: 'Copie a chave', desc: 'IMPORTANTE: A chave só aparece uma vez! Copie imediatamente (começa com "sk-..."). Se perder, crie outra.' },
      { title: 'Cole no VideoForge', desc: 'Volte ao VideoForge, cole a chave no campo "OpenAI" e clique em Salvar.' },
    ],
    tips: ['Com $5 você gera centenas de interações.', 'Acompanhe seus gastos em platform.openai.com/usage.', 'Você pode definir um limite de gastos mensal em Settings > Limits.'],
  },

  OPENROUTER_API_KEY: {
    title: 'OpenRouter',
    icon: '🔀',
    free: false,
    color: '#6366f1',
    estimatedTime: '3 min',
    pricing: 'Varia por modelo — muitos modelos gratuitos disponíveis',
    steps: [
      { title: 'Crie uma conta OpenRouter', desc: 'Acesse o OpenRouter e faça login com Google ou email.', link: 'https://openrouter.ai/', linkLabel: 'Abrir OpenRouter' },
      { title: 'Vá para API Keys', desc: 'Clique no seu perfil e vá em "Keys".', link: 'https://openrouter.ai/keys', linkLabel: 'Gerenciar Keys' },
      { title: 'Crie uma nova chave', desc: 'Clique em "Create Key", dê um nome (ex: "VideoForge") e confirme.' },
      { title: 'Copie e cole', desc: 'Copie a chave gerada e cole no campo "OpenRouter" do VideoForge.' },
    ],
    tips: ['O OpenRouter oferece acesso a vários modelos (Claude, Llama, Mistral, etc.).', 'Alguns modelos são gratuitos!', 'Você pode adicionar créditos conforme precisar.'],
  },

  REPLICATE_API_TOKEN: {
    title: 'Replicate (Wan 2.1)',
    icon: '🎬',
    free: false,
    color: '#3b82f6',
    estimatedTime: '3 min',
    pricing: '~$0.01-0.05 por segundo de vídeo gerado',
    steps: [
      { title: 'Crie uma conta Replicate', desc: 'Acesse o Replicate e crie sua conta (pode usar GitHub).', link: 'https://replicate.com/signin', linkLabel: 'Criar conta Replicate' },
      { title: 'Vá para API Tokens', desc: 'Clique no seu perfil → Account settings → API tokens.', link: 'https://replicate.com/account/api-tokens', linkLabel: 'Gerenciar Tokens' },
      { title: 'Crie um token', desc: 'Clique em "Create token", dê um nome e copie o token gerado.' },
      { title: 'Cole no VideoForge', desc: 'Volte ao VideoForge, cole o token no campo "Replicate" e clique em Salvar.' },
    ],
    tips: ['Novos usuários ganham créditos grátis para testar.', 'Os vídeos Wan 2.1 têm qualidade cinematográfica.'],
  },

  KLING_ACCESS_KEY_ID: {
    title: 'Kling AI',
    icon: '🎥',
    free: false,
    color: '#8b5cf6',
    estimatedTime: '5 min',
    pricing: 'Planos a partir de ~$5/mês',
    steps: [
      { title: 'Crie uma conta Kling AI', desc: 'Acesse a plataforma Kling AI e crie uma conta.', link: 'https://platform.klingai.com', linkLabel: 'Abrir Kling AI' },
      { title: 'Acesse as configurações da API', desc: 'Vá em Settings ou API Management no painel da Kling.' },
      { title: 'Gere suas credenciais', desc: 'Crie um par de credenciais: Access Key ID e Access Key Secret. Anote as duas.' },
      { title: 'Cole no VideoForge', desc: 'Cole o Access Key ID no campo "Kling AI — Key ID" e o Secret no campo "Kling AI — Key Secret".' },
    ],
    tips: ['Você precisa preencher DOIS campos: Key ID e Key Secret.', 'Os vídeos têm qualidade cinematográfica premium.'],
  },

  HUGGINGFACE_API_TOKEN: {
    title: 'Hugging Face',
    icon: '🤗',
    free: false,
    color: '#ff9d00',
    estimatedTime: '3 min',
    pricing: 'Gratuito para modelos leves, pago para modelos pesados',
    steps: [
      { title: 'Crie uma conta Hugging Face', desc: 'Acesse o Hugging Face e crie sua conta gratuita.', link: 'https://huggingface.co/join', linkLabel: 'Criar conta' },
      { title: 'Vá para Access Tokens', desc: 'No seu perfil, vá em Settings → Access Tokens.', link: 'https://huggingface.co/settings/tokens', linkLabel: 'Gerenciar Tokens' },
      { title: 'Crie um novo token', desc: 'Clique em "New token", escolha o tipo "Read" (leitura) e dê um nome.' },
      { title: 'Copie e cole', desc: 'Copie o token (começa com "hf_...") e cole no campo "Hugging Face" do VideoForge.' },
    ],
    tips: ['O Hugging Face hospeda milhares de modelos de IA open-source.', 'Alguns modelos mais pesados exigem plano Pro.'],
  },

  DID_API_KEY: {
    title: 'D-ID (Avatar / Talking Photo)',
    icon: '👤',
    free: false,
    color: '#ec4899',
    estimatedTime: '4 min',
    pricing: '~$0.05 por vídeo curto (depende do plano)',
    steps: [
      { title: 'Crie uma conta D-ID', desc: 'Acesse o D-ID Studio e crie sua conta (pode usar Google).', link: 'https://studio.d-id.com/', linkLabel: 'Criar conta D-ID' },
      { title: 'Acesse as configurações', desc: 'No painel, clique no seu avatar/perfil → Settings ou API.' },
      { title: 'Gere sua API Key', desc: 'Na seção de API Keys, gere uma nova chave. Copie-a.' },
      { title: 'Cole no VideoForge', desc: 'Cole a chave no campo "D-ID (Avatar)" do VideoForge.' },
      { title: '(Opcional) URL do Apresentador', desc: 'Se quiser usar um avatar personalizado, cole a URL da imagem no campo "D-ID — URL do Apresentador".' },
    ],
    tips: ['Novos usuários ganham créditos de teste grátis.', 'Usado para Talking Photo e Avatar Apresentador.', 'Quanto menor o vídeo, menor o custo.'],
  },

  ELEVENLABS_API_KEY: {
    title: 'ElevenLabs (Narração Ultra-Realista)',
    icon: '🗣️',
    free: false,
    color: '#f59e0b',
    estimatedTime: '4 min',
    pricing: 'Plano grátis: 10K chars/mês. Planos pagos a partir de $5/mês',
    steps: [
      { title: 'Crie uma conta ElevenLabs', desc: 'Acesse o ElevenLabs e crie sua conta (plano gratuito disponível).', link: 'https://elevenlabs.io/', linkLabel: 'Criar conta ElevenLabs' },
      { title: 'Vá para Profile + API Key', desc: 'Clique no seu perfil → Profile + API Key no menu lateral.', link: 'https://elevenlabs.io/app/settings/api-keys', linkLabel: 'Página da API Key' },
      { title: 'Copie sua API Key', desc: 'Sua chave estará visível na seção "API Key". Clique no ícone de copiar.' },
      { title: 'Cole no VideoForge', desc: 'Cole a chave no campo "ElevenLabs" do VideoForge.' },
      { title: '(Opcional) Voice ID', desc: 'Para usar uma voz específica, vá em Voices → clique na voz → copie o Voice ID da URL ou das configurações. Cole no campo "ElevenLabs — Voice ID".', link: 'https://elevenlabs.io/app/voice-library', linkLabel: 'Biblioteca de Vozes' },
    ],
    tips: ['O plano gratuito dá 10.000 caracteres/mês — suficiente para testar.', 'As vozes do ElevenLabs são as mais realistas do mercado.', 'Você pode clonar sua própria voz no plano pago.'],
  },

  HEYGEN_API_KEY: {
    title: 'HeyGen (Avatar IA)',
    icon: '🎭',
    free: false,
    color: '#6366f1',
    estimatedTime: '3 min',
    pricing: 'Plano grátis: 3 créditos/mês. Creator: $29/mês (15 créditos)',
    steps: [
      { title: 'Crie uma conta HeyGen', desc: 'Acesse o HeyGen e crie sua conta.', link: 'https://app.heygen.com', linkLabel: 'Criar conta HeyGen' },
      { title: 'Acesse a página de API Key', desc: 'No painel da HeyGen, clique no ícone do perfil → API Key.', link: 'https://app.heygen.com/settings?nav=API', linkLabel: 'Página de API Key' },
      { title: 'Gere e copie a chave', desc: 'Clique em "Generate API Key", dê um nome e copie a chave gerada.' },
      { title: 'Cole no VideoForge', desc: 'Cole a chave no campo "HeyGen (Avatar IA)" do VideoForge.' },
      { title: '(Opcional) Avatar ID', desc: 'Acesse Avatars, escolha um avatar e copie o ID da URL ou do painel. O padrão já usa um avatar público gratuito.', link: 'https://app.heygen.com/avatars', linkLabel: 'Avatares HeyGen' },
    ],
    tips: ['Plano gratuito dá 3 créditos/mês (~3 vídeos curtos).', 'Cada cena usa ~5 créditos. Para vídeos longos, assine o plano Creator.', 'O avatar padrão Daisy já está configurado — não precisa de Avatar ID para testar.'],
  },

  PIXABAY_API_KEY: {
    title: 'Pixabay (Músicas)',
    icon: '🎵',
    free: true,
    color: '#22c55e',
    estimatedTime: '3 min',
    steps: [
      { title: 'Crie uma conta Pixabay', desc: 'Acesse o Pixabay e crie uma conta gratuita.', link: 'https://pixabay.com/accounts/register/', linkLabel: 'Criar conta Pixabay' },
      { title: 'Acesse a documentação da API', desc: 'Vá para a página de documentação da API do Pixabay.', link: 'https://pixabay.com/api/docs/', linkLabel: 'Documentação da API' },
      { title: 'Pegue sua chave', desc: 'Depois de logado, sua API Key aparece no topo da documentação (campo "key" preenchido automaticamente). Copie-a.' },
      { title: 'Cole no VideoForge', desc: 'Cole a chave no campo "Pixabay" do VideoForge e clique em Salvar.' },
    ],
    tips: ['A API é 100% gratuita.', 'Usada para músicas de fundo nos vídeos.', 'Todas as músicas são livres de royalties.'],
  },
}

// keys extras que redirecionam para o guia pai
const KEY_ALIASES = {
  KLING_ACCESS_KEY_SECRET: 'KLING_ACCESS_KEY_ID',
  DID_PRESENTER_URL: 'DID_API_KEY',
  ELEVENLABS_VOICE_ID: 'ELEVENLABS_API_KEY',
  HEYGEN_AVATAR_ID: 'HEYGEN_API_KEY',
  HEYGEN_VOICE_ID: 'HEYGEN_API_KEY',
}

export { GUIDES }

export function getGuideForKey(keyName) {
  const resolved = KEY_ALIASES[keyName] || keyName
  return GUIDES[resolved] || null
}

export default function ApiKeyGuideModal({ keyName, onClose }) {
  const [currentStep, setCurrentStep] = useState(0)
  const guide = getGuideForKey(keyName)
  if (!guide) return null

  const total = guide.steps.length
  const step = guide.steps[currentStep]
  const progress = ((currentStep + 1) / total) * 100

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#12121f', border: `1px solid ${guide.color}44`,
        borderRadius: '20px', width: '100%', maxWidth: '560px',
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: `0 0 60px ${guide.color}22`,
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>{guide.icon}</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                Como configurar: {guide.title}
              </h2>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
                  background: guide.free ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                  color: guide.free ? '#4ade80' : '#fbbf24',
                }}>
                  {guide.free ? '🟢 Grátis' : '🟡 Pago'}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>⏱️ {guide.estimatedTime}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px',
            color: '#94a3b8', fontSize: '18px', cursor: 'pointer', width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '0 28px', marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
              Passo {currentStep + 1} de {total}
            </span>
            <span style={{ fontSize: '12px', color: guide.color, fontWeight: 700 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%', borderRadius: '4px', background: guide.color,
              width: `${progress}%`, transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Step Content */}
        <div style={{ padding: '24px 28px' }}>
          {/* Step circles */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {guide.steps.map((s, i) => (
              <button key={i} onClick={() => setCurrentStep(i)} style={{
                width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                background: i === currentStep ? guide.color : i < currentStep ? `${guide.color}33` : 'rgba(255,255,255,0.06)',
                color: i === currentStep ? '#fff' : i < currentStep ? guide.color : '#64748b',
              }}>
                {i < currentStep ? '✓' : i + 1}
              </button>
            ))}
          </div>

          {/* Step details */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px', padding: '24px',
          }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '16px', fontWeight: 700, color: '#fff' }}>
              <span style={{ color: guide.color, marginRight: '8px' }}>{currentStep + 1}.</span>
              {step.title}
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
              {step.desc}
            </p>
            {step.link && (
              <a href={step.link} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                marginTop: '14px', padding: '10px 20px', borderRadius: '10px',
                background: `${guide.color}18`, border: `1px solid ${guide.color}44`,
                color: guide.color, fontSize: '13px', fontWeight: 700,
                textDecoration: 'none', transition: 'all 0.2s',
              }}>
                🔗 {step.linkLabel}
                <span style={{ fontSize: '16px' }}>↗</span>
              </a>
            )}
          </div>

          {/* Pricing info */}
          {guide.pricing && currentStep === 0 && (
            <div style={{
              marginTop: '14px', padding: '12px 16px', borderRadius: '10px',
              background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
            }}>
              <span style={{ fontSize: '12px', color: '#fbbf24' }}>
                💰 Custo estimado: {guide.pricing}
              </span>
            </div>
          )}

          {/* Tips (show on last step) */}
          {currentStep === total - 1 && guide.tips && (
            <div style={{
              marginTop: '14px', padding: '16px', borderRadius: '10px',
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
            }}>
              <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: '#4ade80' }}>💡 Dicas</p>
              {guide.tips.map((tip, i) => (
                <p key={i} style={{ margin: '0', fontSize: '12px', color: '#94a3b8', lineHeight: 1.7 }}>
                  • {tip}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{
          padding: '16px 28px 24px', display: 'flex', justifyContent: 'space-between', gap: '12px',
        }}>
          <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} style={{
            padding: '10px 24px', borderRadius: '10px', border: 'none',
            background: currentStep === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
            color: currentStep === 0 ? '#475569' : '#e2e8f0',
            fontSize: '14px', fontWeight: 600, cursor: currentStep === 0 ? 'default' : 'pointer',
          }}>
            ← Anterior
          </button>
          {currentStep < total - 1 ? (
            <button onClick={() => setCurrentStep(currentStep + 1)} style={{
              padding: '10px 28px', borderRadius: '10px', border: 'none',
              background: guide.color, color: '#fff',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            }}>
              Próximo →
            </button>
          ) : (
            <button onClick={onClose} style={{
              padding: '10px 28px', borderRadius: '10px', border: 'none',
              background: '#22c55e', color: '#fff',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            }}>
              ✅ Entendi, fechar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
