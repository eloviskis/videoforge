import { useState, useEffect } from 'react'

export default function LandingPage({ onGoLogin }) {
  const API_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : (window.location.port === '3000' ? 'http://localhost:3001/api' : `${window.location.origin}/api`)

  const [precos, setPrecos] = useState({})
  const [avisoTokens, setAvisoTokens] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [visibleSections, setVisibleSections] = useState({})

  useEffect(() => {
    fetch(`${API_URL}/public/precos`)
      .then(r => r.json())
      .then(data => {
        setPrecos(data)
        if (data.aviso_tokens) setAvisoTokens(data.aviso_tokens)
      })
      .catch(() => {})
  }, [])

  // Intersection Observer for fade-in animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => ({ ...prev, [entry.target.id]: true }))
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )
    document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const features = [
    { icon: '🤖', title: 'Roteiro com IA', desc: 'Gemini gera roteiros completos a partir de um tema. Basta digitar e pronto.' },
    { icon: '🎤', title: 'Narração Automática', desc: 'Voz neural Microsoft Edge TTS ou ElevenLabs. Português e outros idiomas.' },
    { icon: '📸', title: 'Imagens Automáticas', desc: 'Pexels, Pixabay, Stable Diffusion ou DALL-E buscam visuais para cada cena.' },
    { icon: '🎬', title: 'Renderização FFmpeg', desc: 'Ken Burns, transições xfade, overlays de texto — tudo renderizado em 1080p.' },
    { icon: '🧠', title: 'Edição Inteligente com IA', desc: 'A IA analisa seus clipes com visão computacional e sugere cortes, velocidade, volume e ordem ideal. Um clique e pronto.' },
    { icon: '🎞️', title: 'Timeline Editor', desc: 'Monte vídeos com seus próprios clipes: arraste, reordene, corte, ajuste volume e velocidade por clipe.' },
    { icon: '🎵', title: 'Trilha de Áudio', desc: 'Adicione músicas de fundo com controle de volume, fade in/out e posição. Mixe narração + trilha automaticamente.' },
    { icon: '📺', title: 'Upload YouTube', desc: 'Publique direto no YouTube com título, descrição, tags e thumbnail gerados.' },
    { icon: '📰', title: 'Notícias Automáticas', desc: 'Coleta RSS, gera roteiro, narra e renderiza vídeo de notícias do dia.' },
    { icon: '✂️', title: 'Cortes de Vídeo', desc: 'Cole link do YouTube, transcreve com Whisper e corta os melhores momentos.' },
    { icon: '⚡', title: 'Controle de Velocidade', desc: 'Slow-motion ou time-lapse por clipe. De 0.25x a 3x com precisão no áudio via atempo.' },
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
        'Timeline Editor com drag & drop',
        'Edição Inteligente com IA (corte, volume, velocidade)',
        'Trilha de áudio com mixagem automática',
        'Controle de velocidade por clipe (0.25x a 3x)',
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

      {/* ═══ CSS ANIMATIONS ═══ */}
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
        .fade-section{opacity:0;transform:translateY(30px);transition:all 0.7s cubic-bezier(0.4,0,0.2,1)}
        .fade-section.visible{opacity:1;transform:translateY(0)}
        .cta-btn:hover{transform:translateY(-2px)!important;box-shadow:0 8px 30px rgba(139,92,246,0.6)!important}
        .feature-card:hover{border-color:rgba(139,92,246,0.3)!important;transform:translateY(-4px)}
        .nav-link:hover{color:#c4b5fd!important}
        @media(max-width:768px){.hide-mobile{display:none!important}.show-mobile{display:flex!important}}
      `}</style>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10,10,26,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }} role="navigation" aria-label="Menu principal">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="VideoForge" style={{ width: '32px', height: '32px', borderRadius: '8px' }} loading="eager" />
          <strong style={{ fontSize: '20px', background: 'linear-gradient(135deg,#8b5cf6,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            VideoForge
          </strong>
        </div>

        {/* Desktop menu */}
        <div className="hide-mobile" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="/blog/" className="nav-link" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px', padding: '8px 12px', transition: 'color 0.2s' }}>Blog</a>
          <a href="#features" className="nav-link" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px', padding: '8px 12px', transition: 'color 0.2s' }}>Recursos</a>
          <a href="#precos" className="nav-link" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px', padding: '8px 12px', transition: 'color 0.2s' }}>Preços</a>
          <a href="#faq" className="nav-link" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px', padding: '8px 12px', transition: 'color 0.2s' }}>FAQ</a>
          <button onClick={onGoLogin} style={{
            padding: '8px 20px', borderRadius: '8px', border: '1px solid #8b5cf6',
            background: 'transparent', color: '#c4b5fd', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
          }}>Entrar</button>
        </div>

        {/* Mobile hamburger */}
        <button className="show-mobile" onClick={() => setMobileMenu(!mobileMenu)} style={{
          display: 'none', background: 'none', border: 'none', color: '#c4b5fd', fontSize: '24px', cursor: 'pointer', padding: '8px',
        }} aria-label="Abrir menu">
          {mobileMenu ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile menu dropdown */}
      {mobileMenu && (
        <div style={{
          position: 'fixed', top: '60px', left: 0, right: 0, zIndex: 99,
          background: 'rgba(10,10,26,0.95)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px',
          animation: 'fadeInUp 0.3s ease',
        }}>
          <a href="/blog/" onClick={() => setMobileMenu(false)} style={{ color: '#e2e8f0', textDecoration: 'none', fontSize: '16px', padding: '12px 0' }}>📝 Blog</a>
          <a href="#features" onClick={() => setMobileMenu(false)} style={{ color: '#e2e8f0', textDecoration: 'none', fontSize: '16px', padding: '12px 0' }}>📋 Recursos</a>
          <a href="#precos" onClick={() => setMobileMenu(false)} style={{ color: '#e2e8f0', textDecoration: 'none', fontSize: '16px', padding: '12px 0' }}>💰 Preços</a>
          <a href="#faq" onClick={() => setMobileMenu(false)} style={{ color: '#e2e8f0', textDecoration: 'none', fontSize: '16px', padding: '12px 0' }}>❓ FAQ</a>
          <button onClick={() => { setMobileMenu(false); onGoLogin() }} style={{
            padding: '12px', borderRadius: '10px', border: '1px solid #8b5cf6',
            background: 'transparent', color: '#c4b5fd', cursor: 'pointer', fontWeight: 600, fontSize: '16px',
          }}>Entrar</button>
        </div>
      )}

      {/* ═══ HERO ═══ */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '120px 24px 80px',
        background: 'radial-gradient(ellipse at center top, rgba(139,92,246,0.18), transparent 60%)',
      }}>
        <div style={{ maxWidth: '800px' }}>
          {/* Logo principal */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <img src="/logo.png" alt="VideoForge - Automação de Vídeos com IA" style={{
              width: '140px', height: '140px', borderRadius: '28px',
              marginBottom: '20px',
              filter: 'drop-shadow(0 0 40px rgba(139,92,246,0.5)) drop-shadow(0 0 80px rgba(168,85,247,0.3))',
              animation: 'float 3s ease-in-out infinite',
            }} loading="eager" />
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
            <a href={precos.hotmart_checkout_vitalicio || '#precos'} target={precos.hotmart_checkout_vitalicio ? '_blank' : undefined} rel="noopener noreferrer" className="cta-btn" style={{
              padding: '14px 32px', borderRadius: '12px', textDecoration: 'none',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
              fontWeight: 700, fontSize: '16px',
              boxShadow: '0 4px 20px rgba(139,92,246,0.5)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}>
              Começar agora — R$ 59 →
            </a>
            <button onClick={onGoLogin} style={{
              padding: '14px 32px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', cursor: 'pointer',
              fontWeight: 600, fontSize: '16px', transition: 'border-color 0.2s',
            }}>
              Já tenho conta
            </button>
          </div>

          {/* Stats melhorados */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', marginTop: '56px', flexWrap: 'wrap' }}>
            {[
              { n: '2.500+', label: 'Vídeos gerados' },
              { n: '350+', label: 'Criadores ativos' },
              { n: '1080p', label: 'Qualidade Full HD' },
              { n: '15+', label: 'APIs integradas' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#c4b5fd' }}>{s.n}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PROVA SOCIAL ═══ */}
      <section id="prova-social" data-animate style={{
        padding: '48px 24px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }} className={`fade-section ${visibleSections['prova-social'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              { nome: 'Ricardo M.', role: 'Criador de conteúdo', texto: 'Gero 5 vídeos por dia sem editar nada. O modo Stock Images com Gemini é incrível — totalmente grátis!', stars: 5 },
              { nome: 'Ana Beatriz S.', role: 'Canal de curiosidades', texto: 'Automatizei meu canal de curiosidades 100%. O sistema de notícias automáticas me economiza horas todos os dias.', stars: 5 },
              { nome: 'Lucas Ferreira', role: 'Empreendedor digital', texto: 'Melhor investimento de R$59 que fiz. Já publiquei mais de 200 vídeos no YouTube no piloto automático.', stars: 5 },
            ].map(t => (
              <div key={t.nome} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '14px', padding: '24px',
              }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                  {Array(t.stars).fill(null).map((_, i) => <span key={i} style={{ color: '#fbbf24', fontSize: '16px' }}>★</span>)}
                </div>
                <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.7, margin: '0 0 16px', fontStyle: 'italic' }}>
                  "{t.texto}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '16px',
                  }}>{t.nome.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{t.nome}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" data-animate style={{ padding: '80px 24px', maxWidth: '1100px', margin: '0 auto' }}
        className={`fade-section ${visibleSections['features'] ? 'visible' : ''}`}>
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
            <div key={f.title} className="feature-card" style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '14px', padding: '24px',
              transition: 'border-color 0.2s, transform 0.2s',
            }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }} role="img" aria-label={f.title}>{f.icon}</span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px', color: '#e2e8f0' }}>{f.title}</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ COMO FUNCIONA ═══ */}
      <section id="como-funciona" data-animate style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.02)' }}
        className={`fade-section ${visibleSections['como-funciona'] ? 'visible' : ''}`}>
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

          {/* CTA INTERMEDIÁRIO */}
          <div style={{ marginTop: '48px' }}>
            <a href={precos.hotmart_checkout_vitalicio || '#precos'} target={precos.hotmart_checkout_vitalicio ? '_blank' : undefined} rel="noopener noreferrer" className="cta-btn" style={{
              padding: '14px 36px', borderRadius: '12px', border: 'none', display: 'inline-block',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
              fontWeight: 700, fontSize: '16px', cursor: 'pointer', textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(139,92,246,0.5)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}>
              Quero automatizar meus vídeos →
            </a>
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '12px' }}>
              🔒 7 dias de garantia · Pagamento seguro via Hotmart
            </p>
          </div>
        </div>
      </section>

      {/* ═══ DESTAQUE: EDIÇÃO INTELIGENTE ═══ */}
      <section id="ai-editing" data-animate style={{
        padding: '80px 24px',
        background: 'linear-gradient(180deg, rgba(139,92,246,0.06), transparent)',
      }} className={`fade-section ${visibleSections['ai-editing'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{
              display: 'inline-block', padding: '6px 16px', borderRadius: '99px', fontSize: '13px',
              background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)',
              color: '#c4b5fd', fontWeight: 600, marginBottom: '16px',
            }}>🆕 NOVO no v1.3</div>
            <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '12px' }}>
              Edição Inteligente com IA
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '16px', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
              Importe seus clipes e deixe a IA montar o vídeo perfeito. Ela analisa cada frame,
              sugere cortes, ajusta velocidade e volume — tudo com um clique.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              { icon: '🧠', title: 'Visão Computacional', desc: 'Gemini Vision analisa o conteúdo visual de cada clipe e entende o que está acontecendo na cena.' },
              { icon: '✂️', title: 'Corte Automático', desc: 'A IA identifica os melhores momentos e corta partes desnecessárias, mantendo apenas o essencial.' },
              { icon: '⚡', title: 'Velocidade Inteligente', desc: 'Slow-motion em cenas de impacto, aceleração em transições. De 0.25x a 3x com áudio preservado.' },
              { icon: '🔊', title: 'Mix de Áudio', desc: 'Narração + trilha de fundo + áudio original — tudo mixado automaticamente com volume ideal.' },
              { icon: '🎯', title: 'Um Clique', desc: 'Clique em "Edição Inteligente" e receba sugestões detalhadas. Aplique todas de uma vez ou ajuste manualmente.' },
              { icon: '🎞️', title: 'Timeline Visual', desc: 'Arraste clipes, reordene, veja a duração efetiva e exporte em 1080p. Editor completo no navegador.' },
            ].map(f => (
              <div key={f.title} className="feature-card" style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)',
                borderRadius: '14px', padding: '24px',
                transition: 'border-color 0.2s, transform 0.2s',
              }}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>{f.icon}</span>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px', color: '#e2e8f0' }}>{f.title}</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <a href={precos.hotmart_checkout_vitalicio || '#precos'} target={precos.hotmart_checkout_vitalicio ? '_blank' : undefined} rel="noopener noreferrer" className="cta-btn" style={{
              padding: '14px 36px', borderRadius: '12px', border: 'none', display: 'inline-block',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
              fontWeight: 700, fontSize: '16px', cursor: 'pointer', textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(139,92,246,0.5)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}>
              Quero a Edição Inteligente →
            </a>
          </div>
        </div>
      </section>

      {/* ═══ PREÇOS ═══ */}
      <section id="precos" data-animate style={{ padding: '80px 24px', maxWidth: '1100px', margin: '0 auto' }}
        className={`fade-section ${visibleSections['precos'] ? 'visible' : ''}`}>
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
              position: 'relative', overflow: 'hidden', width: '100%',
            }}>
              {/* Badge de lançamento */}
              <div style={{
                position: 'absolute', top: '12px', right: '-28px',
                background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', fontSize: '11px', fontWeight: 700,
                padding: '4px 32px', transform: 'rotate(45deg)',
              }}>LANÇAMENTO</div>

              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px', color: '#e2e8f0' }}>
                👑 Acesso Vitalício
              </h3>

              {/* Preço com riscado */}
              <div style={{ margin: '12px 0 4px' }}>
                <span style={{ fontSize: '18px', color: '#64748b', textDecoration: 'line-through', marginRight: '12px' }}>R$ 197</span>
                <span style={{
                  background: 'linear-gradient(135deg, #ef4444, #f59e0b)', color: '#fff',
                  padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                }}>-70% OFF</span>
              </div>
              <div style={{ fontSize: '42px', fontWeight: 800, margin: '8px 0', color: '#fff' }}>
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
                <a href={p.link} target="_blank" rel="noopener noreferrer" className="cta-btn" style={{
                  display: 'block', textAlign: 'center', padding: '15px',
                  borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '16px',
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  color: '#fff', border: 'none',
                  boxShadow: '0 4px 20px rgba(139,92,246,0.5)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}>🔥 Comprar agora — R$ 59</a>
              ) : (
                <button onClick={onGoLogin} style={{
                  width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer',
                  fontWeight: 700, fontSize: '16px',
                }}>🔥 Comprar agora</button>
              )}

              {/* Garantia */}
              <div style={{
                marginTop: '20px', padding: '16px', borderRadius: '10px',
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                textAlign: 'center',
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#86efac', fontWeight: 600 }}>
                  🛡️ Garantia incondicional de 7 dias
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Não gostou? Devolvemos 100% do seu dinheiro. Sem perguntas.
                </p>
              </div>

              {/* Selos de confiança */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>🔒 Pagamento Seguro</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>✅ Hotmart Verificado</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>📧 Acesso Imediato</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ AVISO TOKENS IA ═══ */}
      <section id="aviso-tokens" data-animate style={{ padding: '60px 24px' }}
        className={`fade-section ${visibleSections['aviso-tokens'] ? 'visible' : ''}`}>
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
      <section id="faq" data-animate style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.02)' }}
        className={`fade-section ${visibleSections['faq'] ? 'visible' : ''}`}>
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
      <section id="cta-final" data-animate style={{
        padding: '80px 24px', textAlign: 'center',
        background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.12), transparent 60%)',
      }} className={`fade-section ${visibleSections['cta-final'] ? 'visible' : ''}`}>
        <img src="/logo.png" alt="VideoForge" style={{ width: '64px', height: '64px', borderRadius: '14px', marginBottom: '20px', filter: 'drop-shadow(0 0 20px rgba(139,92,246,0.4))' }} loading="lazy" />
        <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>
          Pronto para automatizar seus vídeos?
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '18px', marginBottom: '8px' }}>
          <span style={{ textDecoration: 'line-through', color: '#64748b' }}>R$ 197</span>{' '}
          <strong style={{ color: '#fff', fontSize: '24px' }}>R$ {precos.preco_vitalicio || '59'}</strong>{' '}
          <span style={{ color: '#64748b' }}>— pagamento único</span>
        </p>
        <p style={{ color: '#86efac', fontSize: '14px', marginBottom: '32px' }}>
          🛡️ 7 dias de garantia incondicional · 🔒 Pagamento seguro via Hotmart
        </p>
        <a href={precos.hotmart_checkout_vitalicio || '#precos'} target={precos.hotmart_checkout_vitalicio ? '_blank' : undefined} rel="noopener noreferrer" className="cta-btn" style={{
          padding: '16px 40px', borderRadius: '12px', border: 'none', display: 'inline-block',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
          fontWeight: 700, fontSize: '18px', cursor: 'pointer', textDecoration: 'none',
          boxShadow: '0 4px 20px rgba(139,92,246,0.5)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}>
          🔥 Garantir acesso vitalício →
        </a>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        padding: '48px 24px 32px', textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        color: '#4b5563', fontSize: '13px',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <div style={{ textAlign: 'left', minWidth: '180px' }}>
              <h4 style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Produto</h4>
              <a href="#features" style={{ display: 'block', color: '#64748b', textDecoration: 'none', padding: '3px 0', fontSize: '13px' }}>Recursos</a>
              <a href="#precos" style={{ display: 'block', color: '#64748b', textDecoration: 'none', padding: '3px 0', fontSize: '13px' }}>Preços</a>
              <a href="#faq" style={{ display: 'block', color: '#64748b', textDecoration: 'none', padding: '3px 0', fontSize: '13px' }}>FAQ</a>
            </div>
            <div style={{ textAlign: 'left', minWidth: '180px' }}>
              <h4 style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Blog</h4>
              <a href="/blog/como-criar-videos-com-ia.html" style={{ display: 'block', color: '#64748b', textDecoration: 'none', padding: '3px 0', fontSize: '13px' }}>Criar vídeos com IA</a>
              <a href="/blog/automatizar-canal-youtube-com-ia.html" style={{ display: 'block', color: '#64748b', textDecoration: 'none', padding: '3px 0', fontSize: '13px' }}>Automatizar YouTube</a>
              <a href="/blog/ganhar-dinheiro-youtube-sem-aparecer.html" style={{ display: 'block', color: '#64748b', textDecoration: 'none', padding: '3px 0', fontSize: '13px' }}>YouTube sem aparecer</a>
            </div>
            <div style={{ textAlign: 'left', minWidth: '180px' }}>
              <h4 style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Legal</h4>
              <a href="/privacy" style={{ display: 'block', color: '#64748b', textDecoration: 'none', padding: '3px 0', fontSize: '13px' }}>Política de Privacidade</a>
              <a href="/terms" style={{ display: 'block', color: '#64748b', textDecoration: 'none', padding: '3px 0', fontSize: '13px' }}>Termos de Uso</a>
              <a href="mailto:eloi.santaroza@gmail.com" style={{ display: 'block', color: '#64748b', textDecoration: 'none', padding: '3px 0', fontSize: '13px' }}>Contato</a>
              <a href="/afiliados" style={{ display: 'block', color: '#fbbf24', textDecoration: 'none', padding: '3px 0', fontSize: '13px', fontWeight: 600 }}>💰 Seja Afiliado</a>
            </div>
          </div>
          <p style={{ margin: '0 0 8px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '20px' }}>
            © 2026 VideoForge. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
