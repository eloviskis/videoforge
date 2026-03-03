import { useState, useEffect } from 'react'

export default function LandingPage({ onGoLogin }) {
  const API_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : (window.location.port === '3000' ? 'http://localhost:3001/api' : `${window.location.origin}/api`)

  const [precos, setPrecos] = useState({})
  const [avisoTokens, setAvisoTokens] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/public/precos`)
      .then(r => r.json())
      .then(data => {
        setPrecos(data)
        if (data.aviso_tokens) setAvisoTokens(data.aviso_tokens)
      })
      .catch(() => {})
  }, [])

  const features = [
    { icon: '🤖', title: 'Roteiro com IA', desc: 'Gemini gera roteiros completos a partir de um tema. Basta digitar e pronto.' },
    { icon: '🎤', title: 'Narração Automática', desc: 'Voz neural Microsoft Edge TTS ou ElevenLabs. Português e outros idiomas.' },
    { icon: '📸', title: 'Imagens Automáticas', desc: 'Pexels, Pixabay, Stable Diffusion ou DALL-E buscam visuais para cada cena.' },
    { icon: '🎬', title: 'Renderização FFmpeg', desc: 'Ken Burns, transições xfade, overlays de texto — tudo renderizado em 1080p.' },
    { icon: '📺', title: 'Upload YouTube', desc: 'Publique direto no YouTube com título, descrição, tags e thumbnail gerados.' },
    { icon: '📰', title: 'Notícias Automáticas', desc: 'Coleta RSS, gera roteiro, narra e renderiza vídeo de notícias do dia.' },
    { icon: '✂️', title: 'Cortes de Vídeo', desc: 'Cole link do YouTube, transcreve com Whisper e corta os melhores momentos.' },
    { icon: '🎵', title: 'Multi-Plataforma', desc: 'Publique no YouTube, TikTok, Twitter e Facebook de uma só vez.' },
  ]

  const planos = [
    {
      nome: 'Acesso Vitalício',
      preco: `R$ ${precos.preco_vitalicio || '59'}`,
      periodo: 'pagamento único',
      destaque: true,
      items: [
        'Vídeos ilimitados',
        'Roteiro automático com IA',
        'Narração Edge TTS (grátis)',
        'Notícias automáticas',
        'Cortes de vídeo',
        'Multi-plataforma (YouTube, TikTok, Twitter…)',
        'Download app Windows',
        'Atualizações vitalícias',
        'Suporte prioritário',
      ],
      cta: '🔥 Comprar agora — R$ 59',
      link: precos.hotmart_checkout_vitalicio || null,
      badge: '👑',
    },
  ]

  const faqs = [
    { q: 'Preciso saber programar?', a: 'Não! A interface é 100% visual. Basta digitar o tema e clicar em gerar.' },
    { q: 'Quais APIs preciso configurar?', a: 'No mínimo: Gemini (grátis) e Pexels (grátis). Após o login, clique em ⚙️ Minha Conta para configurar suas chaves.' },
    { q: 'Funciona para qualquer nicho?', a: 'Sim! Curiosidades, notícias, motivacional, dark, educacional, gaming e qualquer outro.' },
    { q: 'Como funciona o pagamento?', a: 'Pagamento único de R$ 59 via Hotmart (boleto, PIX, cartão). Após o pagamento, sua conta é ativada automaticamente com acesso vitalício.' },
    { q: 'Os tokens de IA estão inclusos?', a: 'Não. Os R$ 59 são pelo acesso à plataforma. Os tokens de IA (Replicate, Kling, ElevenLabs, etc.) São consumidos das suas próprias contas nesses provedores. Porém, os modos Stock Images e Stick Animation são 100% gratuitos!' },
    { q: 'E se eu já tiver meu próprio servidor?', a: 'O VideoForge roda em qualquer VPS Linux com Docker. Você tem controle total.' },
  ]

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#fff', background: '#0a0a1a' }}>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10,10,26,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="VideoForge" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
          <strong style={{ fontSize: '20px', background: 'linear-gradient(135deg,#8b5cf6,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            VideoForge
          </strong>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a href="#precos" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px', padding: '8px 12px' }}>Preços</a>
          <a href="#faq" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px', padding: '8px 12px' }}>FAQ</a>
          <button onClick={onGoLogin} style={{
            padding: '8px 20px', borderRadius: '8px', border: '1px solid #8b5cf6',
            background: 'transparent', color: '#c4b5fd', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
          }}>Entrar</button>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '120px 24px 80px',
        background: 'radial-gradient(ellipse at center top, rgba(139,92,246,0.18), transparent 60%)',
      }}>
        <div style={{ maxWidth: '800px' }}>
          {/* Logo principal */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <img src="/logo.png" alt="VideoForge" style={{
              width: '140px', height: '140px', borderRadius: '28px',
              marginBottom: '20px',
              filter: 'drop-shadow(0 0 40px rgba(139,92,246,0.5)) drop-shadow(0 0 80px rgba(168,85,247,0.3))',
              animation: 'float 3s ease-in-out infinite',
            }} />
            <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
            <div style={{
              padding: '6px 16px', borderRadius: '99px', fontSize: '13px',
              background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)',
              color: '#c4b5fd', fontWeight: 500,
            }}>
              ⚡ Automatize seu canal de vídeos com IA
            </div>
          </div>
          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1,
            margin: '0 0 20px',
            background: 'linear-gradient(135deg, #fff, #ddd6fe, #c084fc)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Crie vídeos prontos para o YouTube em minutos
          </h1>
          <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 36px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            Roteiro, narração, imagens e renderização — tudo automático.
            Digite um tema e receba um vídeo completo em 1080p com um clique.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#precos" style={{
              padding: '14px 32px', borderRadius: '12px', textDecoration: 'none',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
              fontWeight: 700, fontSize: '16px',
              boxShadow: '0 4px 20px rgba(139,92,246,0.5)',
              transition: 'transform 0.2s',
            }}>
              Começar agora →
            </a>
            <button onClick={onGoLogin} style={{
              padding: '14px 32px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', cursor: 'pointer',
              fontWeight: 600, fontSize: '16px',
            }}>
              Já tenho conta
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', marginTop: '56px', flexWrap: 'wrap' }}>
            {[
              { n: '8+', label: 'Tipos de vídeo' },
              { n: '15+', label: 'APIs integradas' },
              { n: '1080p', label: 'Qualidade HD' },
              { n: '0', label: 'Código necessário' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#c4b5fd' }}>{s.n}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section style={{ padding: '80px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '36px', fontWeight: 800, marginBottom: '12px' }}>
          Tudo que você precisa
        </h2>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '48px', fontSize: '16px' }}>
          Do roteiro ao upload — zero trabalho manual
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '20px',
        }}>
          {features.map(f => (
            <div key={f.title} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '14px', padding: '24px',
              transition: 'border-color 0.2s, transform 0.2s',
            }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>{f.icon}</span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px', color: '#e2e8f0' }}>{f.title}</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ COMO FUNCIONA ═══ */}
      <section style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '48px' }}>Como funciona</h2>
          <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { step: '1', title: 'Digite o tema', desc: 'Ex: "5 fatos sobre o espaço" ou "Notícias do dia"', icon: '✍️' },
              { step: '2', title: 'IA gera tudo', desc: 'Roteiro, narração, imagens e trilha sonora automaticamente', icon: '🤖' },
              { step: '3', title: 'Vídeo pronto', desc: 'Download em 1080p ou publique direto no YouTube', icon: '🚀' },
            ].map(s => (
              <div key={s.step} style={{ flex: '1', minWidth: '220px', maxWidth: '280px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', margin: '0 auto 16px',
                  boxShadow: '0 4px 20px rgba(139,92,246,0.35)',
                }}>{s.icon}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
                  <span style={{ color: '#a855f7' }}>{s.step}.</span> {s.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PREÇOS ═══ */}
      <section id="precos" style={{ padding: '80px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '36px', fontWeight: 800, marginBottom: '12px' }}>
          Preço único, acesso vitalício
        </h2>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '48px', fontSize: '16px' }}>
          Pague uma vez, use para sempre. Sem mensalidade.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', maxWidth: '750px', margin: '0 auto' }}>
          {planos.map(p => (
            <div key={p.nome} style={{
              background: p.badge === '👑'
                ? 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(139,92,246,0.12))'
                : p.destaque ? 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(168,85,247,0.08))' : 'rgba(255,255,255,0.03)',
              border: p.badge === '👑' ? '2px solid #a855f7' : p.destaque ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px', padding: '28px',
              position: 'relative', overflow: 'hidden',
            }}>
              {p.destaque && (
                <div style={{
                  position: 'absolute', top: '12px', right: '-28px',
                  background: '#8b5cf6', color: '#fff', fontSize: '11px', fontWeight: 700,
                  padding: '4px 32px', transform: 'rotate(45deg)',
                }}>POPULAR</div>
              )}
              {p.badge === '👑' && (
                <div style={{
                  position: 'absolute', top: '12px', right: '-28px',
                  background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', fontSize: '11px', fontWeight: 700,
                  padding: '4px 32px', transform: 'rotate(45deg)',
                }}>MELHOR</div>
              )}
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px', color: '#e2e8f0' }}>
                {p.badge ? `${p.badge} ` : ''}{p.nome}
              </h3>
              <div style={{ fontSize: '36px', fontWeight: 800, margin: '8px 0', color: '#fff' }}>
                {p.preco}
                <span style={{ fontSize: '14px', fontWeight: 400, color: '#64748b' }}> {p.periodo}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0' }}>
                {p.items.map(item => (
                  <li key={item} style={{ fontSize: '13px', color: '#94a3b8', padding: '5px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: '#a855f7' }}>✓</span> {item}
                  </li>
                ))}
              </ul>
              {p.link ? (
                <a href={p.link} target="_blank" rel="noopener noreferrer" style={{
                  display: 'block', textAlign: 'center', padding: '13px',
                  borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '15px',
                  background: p.badge === '👑'
                    ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                    : p.destaque ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'rgba(255,255,255,0.08)',
                  color: '#fff', border: (p.destaque || p.badge) ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: p.destaque ? '0 4px 15px rgba(139,92,246,0.5)' : p.badge === '👑' ? '0 4px 15px rgba(245,158,11,0.4)' : 'none',
                }}>{p.cta}</a>
              ) : (
                <button onClick={onGoLogin} style={{
                  width: '100%', padding: '13px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer',
                  fontWeight: 700, fontSize: '15px',
                }}>{p.cta}</button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══ AVISO TOKENS IA ═══ */}
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.05))',
            border: '1px solid rgba(245,158,11,0.2)', borderRadius: '16px', padding: '32px',
          }}>
            <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 16px', color: '#fcd34d' }}>
              ⚠️ Importante: Tokens de IA são por sua conta
            </h3>
            <p style={{ fontSize: '15px', color: '#cbd5e1', lineHeight: 1.8, margin: '0 0 12px' }}>
              O VideoForge é a <strong style={{ color: '#e2e8f0' }}>ferramenta de automação</strong> — os R$ 59 garantem acesso vitalício a toda a plataforma.
            </p>
            <p style={{ fontSize: '15px', color: '#cbd5e1', lineHeight: 1.8, margin: '0 0 12px' }}>
              Porém, <strong style={{ color: '#fcd34d' }}>os créditos de IA (geração de vídeo, vozes premium, etc.) são consumidos das suas próprias contas</strong> nos provedores como Replicate, Kling, ElevenLabs, OpenAI, etc.
              Você cria sua conta gratuita em cada provedor e usa os créditos deles.
            </p>
            <p style={{ fontSize: '15px', color: '#86efac', lineHeight: 1.8, margin: '0 0 20px', fontWeight: 600 }}>
              ✅ Boa notícia: os modos Stock Images e Stick Animation são 100% gratuitos — você pode gerar vídeos sem gastar nada com IA!
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#86efac', marginBottom: '8px' }}>🟢 100% Gratuito</div>
                <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.8 }}>
                  <li><strong>Stock Images</strong> — Pexels/Pixabay</li>
                  <li><strong>Stick Animation</strong> — Animação local</li>
                  <li><strong>Roteiro</strong> — Gemini (API gratuita)</li>
                  <li><strong>Narração</strong> — Edge TTS (gratuito)</li>
                </ul>
              </div>
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#fcd34d', marginBottom: '8px' }}>🟡 Freemium (créditos limitados)</div>
                <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.8 }}>
                  <li><strong>HuggingFace</strong> — vídeo IA</li>
                  <li><strong>Replicate</strong> — ~R$0,03/cena</li>
                  <li><strong>ElevenLabs</strong> — voz premium</li>
                </ul>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#fca5a5', marginBottom: '8px' }}>🔴 Pago (requer tokens próprios)</div>
                <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.8 }}>
                  <li><strong>Kling AI</strong> — vídeo premium</li>
                  <li><strong>Veo 3 (Google)</strong> — ~R$2/seg</li>
                  <li><strong>Sora (OpenAI)</strong> — créditos ChatGPT</li>
                  <li><strong>D-ID</strong> — avatar apresentador</li>
                </ul>
              </div>
            </div>

            <p style={{ margin: '16px 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
              💡 <strong>Recomendação:</strong> Comece com Stock Images + Gemini + Edge TTS (tudo grátis!). 
              Quando quiser vídeos com IA generativa, configure os tokens do provedor desejado em ⚙️ Minha Conta.
              O VideoForge <strong>não cobra</strong> pelos tokens — você usa suas próprias chaves de API.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '36px', fontWeight: 800, marginBottom: '40px' }}>
            Perguntas frequentes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {faqs.map(f => (
              <details key={f.q} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px', padding: '18px 20px',
              }}>
                <summary style={{
                  cursor: 'pointer', fontSize: '15px', fontWeight: 600, color: '#e2e8f0',
                  listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  {f.q}
                  <span style={{ color: '#a855f7', fontSize: '18px', flexShrink: 0 }}>+</span>
                </summary>
                <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '12px', lineHeight: 1.6, margin: '12px 0 0' }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section style={{
        padding: '80px 24px', textAlign: 'center',
        background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.12), transparent 60%)',
      }}>
        <img src="/logo.png" alt="" style={{ width: '64px', height: '64px', borderRadius: '14px', marginBottom: '20px', filter: 'drop-shadow(0 0 20px rgba(139,92,246,0.4))' }} />
        <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>
          Pronto para automatizar seus vídeos?
        </h2>
        <p style={{ color: '#64748b', fontSize: '16px', marginBottom: '32px' }}>
          Acesso vitalício por apenas R$ {precos.preco_vitalicio || '59'}. Pague uma vez, use para sempre.
        </p>
        <button onClick={onGoLogin} style={{
          padding: '14px 36px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
          fontWeight: 700, fontSize: '16px', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(139,92,246,0.5)',
        }}>
          🔥 Garantir acesso vitalício →
        </button>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        padding: '32px 24px', textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        color: '#4b5563', fontSize: '13px',
      }}>
        <p style={{ margin: '0 0 8px' }}>
          © 2026 VideoForge. Todos os direitos reservados.
        </p>
        <p style={{ margin: 0 }}>
          <a href="/privacy" style={{ color: '#8b5cf6', textDecoration: 'none', marginRight: '16px' }}>Política de Privacidade</a>
          <a href="/terms" style={{ color: '#8b5cf6', textDecoration: 'none' }}>Termos de Uso</a>
        </p>
      </footer>
    </div>
  )
}
