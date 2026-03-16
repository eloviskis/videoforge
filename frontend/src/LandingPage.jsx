import { useState, useEffect } from 'react'

export default function LandingPage({ onGoLogin }) {
  const API_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : (window.location.port === '3000' ? 'http://localhost:3001/api' : `${window.location.origin}/api`)

  const HOTMART_URL = 'https://pay.hotmart.com/S104720959A?bid=1772552529640&utm_source=site&utm_medium=landing&utm_campaign=main'

  const [precos, setPrecos] = useState({})
  const [mobileMenu, setMobileMenu] = useState(false)
  const [visibleSections, setVisibleSections] = useState({})
  const [showEmailPopup, setShowEmailPopup] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [showStickyBar, setShowStickyBar] = useState(false)

  const checkoutUrl = precos.hotmart_checkout_vitalicio
    ? `${precos.hotmart_checkout_vitalicio}&utm_source=site&utm_medium=landing&utm_campaign=main`
    : HOTMART_URL

  useEffect(() => {
    fetch(`${API_URL}/public/precos`).then(r => r.json()).then(setPrecos).catch(() => {})

    const handleMouseLeave = (e) => {
      if (e.clientY < 10 && !localStorage.getItem('vf_email_shown')) {
        setShowEmailPopup(true)
        localStorage.setItem('vf_email_shown', 'true')
      }
    }
    document.addEventListener('mouseleave', handleMouseLeave)

    const timer = setTimeout(() => {
      if (!localStorage.getItem('vf_email_shown')) {
        setShowEmailPopup(true)
        localStorage.setItem('vf_email_shown', 'true')
      }
    }, 30000)

    const handleScroll = () => setShowStickyBar(window.scrollY > 600)
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave)
      clearTimeout(timer)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!email) return
    try {
      await fetch(`${API_URL}/public/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing_popup' })
      })
      if (window.trackLead) window.trackLead('email_popup')
      setEmailSent(true)
      setTimeout(() => setShowEmailPopup(false), 3000)
    } catch { setEmailSent(true) }
  }

  const handleCTAClick = (label) => {
    if (window.trackCTA) window.trackCTA(label)
    if (window.fbq) window.fbq('track', 'InitiateCheckout', { content_name: 'VideoForge Vitalicio', value: 59, currency: 'BRL' })
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(entry => {
        if (entry.isIntersecting) setVisibleSections(prev => ({ ...prev, [entry.target.id]: true }))
      }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )
    document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const faqs = [
    { q: 'Preciso saber programar?', a: 'Não. O VideoForge tem interface 100% visual. Você digita o tema do vídeo e o software faz todo o resto.' },
    { q: 'Funciona no Mac?', a: 'O VideoForge roda no navegador — funciona em qualquer sistema operacional (Windows, Mac, Linux). Também temos app desktop para Windows.' },
    { q: 'Os vídeos ficam com marca d\'água?', a: 'Não. Os vídeos são 100% seus, sem marca d\'água e sem limitações. Você pode monetizar livremente.' },
    { q: 'Preciso pagar alguma API?', a: 'O núcleo do VideoForge é 100% gratuito: Gemini (roteiro), Edge TTS (narração), Pexels/Pixabay (imagens). Porém, algumas ferramentas premium — como Talking Photo (D-ID) e vozes OpenAI — exigem tokens pagos dessas plataformas externas. Cada usuário configura suas próprias chaves de API nas configurações.' },
    { q: 'A narração parece robótica?', a: 'Não. O Edge TTS usa vozes neurais da Microsoft, com entonação natural em português. O resultado é profissional e indistinguível de uma voz real.' },
    { q: 'E se eu não gostar?', a: 'Você tem 7 dias de garantia pela Hotmart. Se não gostar, pede reembolso e recebe seu dinheiro de volta — sem perguntas, sem burocracia.' },
    { q: 'Posso criar quantos vídeos quiser?', a: 'Sim. Os vídeos com Gemini + Edge TTS são ilimitados e gratuitos. Ferramentas premium (Talking Photo, Avatar Studio com IA externa) consomem tokens da API correspondente — o custo depende do seu uso e plano na plataforma de cada API.' },
    { q: 'Como funciona o review de produto?', a: 'Você digita o nome do produto e a IA gera um vídeo completo de review com prós, contras, nota de 1 a 5, público-alvo e veredicto final. Ideal para canais de afiliados e nichos de tecnologia.' },
    { q: 'O que são "tokens" e chaves de API?', a: 'Tokens são créditos que plataformas de IA (OpenAI, D-ID, ElevenLabs) cobram por uso. O VideoForge não cobra taxas extras — você conecta sua própria chave de API diretamente nas configurações e paga apenas o que consumir na plataforma original. As funcionalidades básicas (roteiro, narração, imagens) não precisam de nenhum token.' },
    { q: 'Como funciona o Social AI para Instagram?', a: 'Você conecta sua conta Instagram profissional pelo Meta (Facebook). A IA analisa seus posts, sugere melhorias, gera legendas, hashtags e até um calendário editorial completo. Você pode publicar direto pelo VideoForge ou agendar posts automáticos.' },
  ]

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#fff', background: '#0a0a14' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.7}}
        @keyframes logoBounce{0%,100%{transform:translateY(0) scale(1)}25%{transform:translateY(-12px) scale(1.04)}50%{transform:translateY(0) scale(1)}75%{transform:translateY(-6px) scale(1.02)}}
        @keyframes logoGlow{0%,100%{filter:drop-shadow(0 0 12px rgba(108,92,231,0.4)) drop-shadow(0 0 40px rgba(108,92,231,0.1))}50%{filter:drop-shadow(0 0 24px rgba(108,92,231,0.7)) drop-shadow(0 0 60px rgba(108,92,231,0.2))}}
        @keyframes logoAppear{from{opacity:0;transform:translateY(40px) scale(0.5) rotate(-10deg)}to{opacity:1;transform:translateY(0) scale(1) rotate(0deg)}}
        .fade-section{opacity:0;transform:translateY(30px);transition:all .7s cubic-bezier(.4,0,.2,1)}
        .fade-section.visible{opacity:1;transform:translateY(0)}
        .cta-green{
          display:inline-block;padding:18px 40px;border-radius:14px;border:none;
          background:linear-gradient(135deg,#00d2a0,#00b894);color:#0a0a14;
          font-weight:800;font-size:18px;cursor:pointer;text-decoration:none;
          box-shadow:0 4px 24px rgba(0,210,160,.4);
          transition:transform .2s,box-shadow .2s;
        }
        .cta-green:hover{transform:translateY(-3px);box-shadow:0 8px 32px rgba(0,210,160,.5)}
        .feature-card{transition:border-color .2s,transform .2s}
        .feature-card:hover{border-color:rgba(108,92,231,.4)!important;transform:translateY(-4px)}
        .nav-link:hover{color:#a29bfe!important}
        @media(max-width:768px){
          .hide-mobile{display:none!important}
          .show-mobile{display:flex!important}
          .hero-h1{font-size:28px!important}
          .steps-grid{flex-direction:column!important;align-items:center!important}
          .compare-grid{grid-template-columns:1fr!important}
          .features-grid{grid-template-columns:1fr!important}
          .footer-grid{flex-direction:column!important;align-items:center!important;text-align:center!important}
          .cta-green{font-size:16px!important;padding:16px 32px!important;width:100%!important;text-align:center}
          .urgency-bar-content{flex-direction:column!important;gap:4px!important;font-size:12px!important}
          .urgency-bar{display:none!important}
          .landing-nav{top:0!important}
          .hero-section{padding-top:100px!important}
        }
      `}</style>

      {/* ═══ BARRA DE URGÊNCIA (topo fixo) ═══ */}
      <div className="urgency-bar" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 110,
        background: 'linear-gradient(90deg, #6c5ce7, #a29bfe)',
        padding: '10px 16px', textAlign: 'center',
        fontSize: '14px', fontWeight: 700, color: '#fff',
      }}>
        <div className="urgency-bar-content" style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <span>🔓 Acesso vitalício</span>
          <span>💳 Pagamento único</span>
          <span>🛡️ Garantia de 7 dias</span>
        </div>
      </div>

      {/* ═══ NAVBAR ═══ */}
      <nav className="landing-nav" style={{
        position: 'fixed', top: '40px', left: 0, right: 0, zIndex: 100,
        background: 'rgba(10,10,20,0.9)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }} role="navigation" aria-label="Menu principal">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="VideoForge" style={{ width: '32px', height: '32px', borderRadius: '8px' }} loading="eager" />
          <strong style={{ fontSize: '18px', color: '#fff' }}>VideoForge</strong>
        </div>
        <div className="hide-mobile" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="#como-funciona" className="nav-link" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px', padding: '8px 12px' }}>Como funciona</a>
          <a href="#comparativo" className="nav-link" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px', padding: '8px 12px' }}>Preços</a>
          <a href="#faq" className="nav-link" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px', padding: '8px 12px' }}>FAQ</a>
          <a href="/blog/" className="nav-link" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px', padding: '8px 12px' }}>Blog</a>
          <button onClick={onGoLogin} style={{
            padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(108,92,231,0.5)',
            background: 'transparent', color: '#a29bfe', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
          }}>Entrar</button>
        </div>
        <button className="show-mobile" onClick={() => setMobileMenu(!mobileMenu)} style={{
          display: 'none', background: 'none', border: 'none', color: '#a29bfe', fontSize: '24px', cursor: 'pointer', padding: '8px',
        }} aria-label="Abrir menu">
          {mobileMenu ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenu && (
        <div style={{
          position: 'fixed', top: '100px', left: 0, right: 0, zIndex: 99,
          background: 'rgba(10,10,20,0.98)', backdropFilter: 'blur(16px)',
          padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px',
          animation: 'fadeInUp 0.3s ease',
        }}>
          {[
            { href: '#como-funciona', label: 'Como funciona' },
            { href: '#comparativo', label: 'Preços' },
            { href: '#faq', label: 'FAQ' },
            { href: '/blog/', label: 'Blog' },
          ].map(l => (
            <a key={l.href} href={l.href} onClick={() => setMobileMenu(false)} style={{ color: '#e2e8f0', textDecoration: 'none', fontSize: '16px', padding: '12px 0' }}>{l.label}</a>
          ))}
          <button onClick={() => { setMobileMenu(false); onGoLogin() }} style={{
            padding: '12px', borderRadius: '10px', border: '1px solid rgba(108,92,231,0.5)',
            background: 'transparent', color: '#a29bfe', cursor: 'pointer', fontWeight: 600, fontSize: '16px',
          }}>Entrar</button>
        </div>
      )}

      {/* ═══ HERO SECTION ═══ */}
      <section className="hero-section" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '160px 24px 80px',
        background: 'radial-gradient(ellipse at center top, rgba(108,92,231,0.15), transparent 60%)',
      }}>
        <div style={{ maxWidth: '820px' }}>
          {/* Logo animado */}
          <div style={{
            animation: 'logoAppear 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            marginBottom: '28px',
          }}>
            <img
              src="/logo.png"
              alt="VideoForge"
              style={{
                width: '100px', height: '100px', borderRadius: '24px',
                animation: 'logoBounce 3s ease-in-out infinite, logoGlow 4s ease-in-out infinite',
                boxShadow: '0 8px 40px rgba(108,92,231,0.3)',
              }}
            />
          </div>
          <h1 className="hero-h1" style={{
            fontSize: 'clamp(32px, 5.5vw, 56px)', fontWeight: 900, lineHeight: 1.1,
            margin: '0 0 24px', color: '#fff',
          }}>
            Publique Vídeos no YouTube Todo Dia — <span style={{ color: '#00d2a0' }}>Sem Gravar, Sem Editar, Sem Aparecer</span>
          </h1>
          <p style={{ fontSize: '20px', color: '#94a3b8', lineHeight: 1.7, margin: '0 0 40px', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
            A IA escreve o roteiro, gera a narração, monta o vídeo em 1080p e publica direto no seu canal. <strong style={{ color: '#e2e8f0' }}>Tudo automático.</strong>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="cta-green" onClick={() => handleCTAClick('hero_comprar')}>
              Quero Começar Agora — R$ 59 →
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>🛡️ 7 dias de garantia Hotmart</span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>🔒 Pagamento seguro</span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>♾️ Acesso vitalício</span>
            </div>
          </div>

          {/* Vídeo / Screencast */}
          <div style={{ marginTop: '56px' }}>
            <div style={{
              position: 'relative', borderRadius: '16px', overflow: 'hidden',
              border: '1px solid rgba(108,92,231,0.3)',
              boxShadow: '0 8px 60px rgba(108,92,231,0.2), 0 0 120px rgba(108,92,231,0.08)',
              maxWidth: '720px', margin: '0 auto', aspectRatio: '16/9',
            }}>
              <iframe
                width="100%" height="100%"
                src="https://www.youtube.com/embed/LX3Wi-Lwa9E?si=YoYtejlK13JFbs_2&controls=1"
                title="VideoForge em ação — Veja o software funcionando"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                loading="lazy"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              />
            </div>
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '12px' }}>
              ▶️ Veja o VideoForge em ação — vídeo gerado 100% por IA
            </p>
          </div>

          {/* Badge garantia */}
          <div style={{ marginTop: '32px', display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '10px 20px', borderRadius: '99px',
            background: 'rgba(0,210,160,0.08)', border: '1px solid rgba(0,210,160,0.25)',
          }}>
            <span style={{ fontSize: '20px' }}>🛡️</span>
            <span style={{ fontSize: '14px', color: '#00d2a0', fontWeight: 600 }}>7 dias de garantia Hotmart — seu dinheiro de volta</span>
          </div>
        </div>
      </section>

      {/* ═══ COMO FUNCIONA (3 passos) ═══ */}
      <section id="como-funciona" data-animate style={{
        padding: '100px 24px',
        background: 'rgba(255,255,255,0.02)',
      }} className={`fade-section ${visibleSections['como-funciona'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>Como funciona</h2>
          <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '56px' }}>3 passos simples para vídeos prontos</p>
          <div className="steps-grid" style={{ display: 'flex', gap: '40px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { step: '1', icon: '✍️', title: 'Digite um tema', desc: 'Ex: "5 fatos sobre o espaço" — A IA escreve o roteiro completo' },
              { step: '2', icon: '🎤', title: 'Narração automática', desc: 'Voz neural realista com Edge TTS (grátis) em português' },
              { step: '3', icon: '🎬', title: 'Vídeo pronto em 1080p', desc: 'Publique direto no YouTube, TikTok, Instagram' },
            ].map(s => (
              <div key={s.step} style={{ flex: '1', minWidth: '240px', maxWidth: '280px' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '20px',
                  background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '32px', margin: '0 auto 20px',
                  boxShadow: '0 8px 30px rgba(108,92,231,0.3)',
                }}>{s.icon}</div>
                <div style={{
                  display: 'inline-block', padding: '4px 12px', borderRadius: '99px', fontSize: '12px',
                  background: 'rgba(108,92,231,0.12)', border: '1px solid rgba(108,92,231,0.3)',
                  color: '#a29bfe', fontWeight: 700, marginBottom: '12px',
                }}>PASSO {s.step}</div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>{s.title}</h3>
                <p style={{ fontSize: '15px', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COMPARATIVO DE CUSTO ═══ */}
      <section id="comparativo" data-animate style={{ padding: '100px 24px' }}
        className={`fade-section ${visibleSections['comparativo'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>
            Quanto custa criar vídeos hoje?
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '48px', fontSize: '16px' }}>
            Compare e decida
          </p>
          <div className="compare-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { icon: '👨‍💻', title: 'Editor freelancer', price: 'R$ 300–500', unit: 'por vídeo', items: ['Depende de terceiros', 'Prazo de dias', 'Custo por vídeo'] },
              { icon: '🔧', title: 'Ferramentas SaaS', sub: 'InVideo, Pictory…', price: 'R$ 80–200', unit: '/mês', items: ['Marca d\'água', 'Limites mensais', 'Mensalidade eterna'] },
              { icon: '⏰', title: 'Seu tempo no CapCut', price: '3–5 horas', unit: 'por vídeo', items: ['Trabalho manual', 'Curva de aprendizado', 'Sem automação'] },
            ].map(c => (
              <div key={c.title} style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px', padding: '28px 20px', textAlign: 'center', opacity: 0.6,
              }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{c.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#94a3b8', textDecoration: 'line-through', marginBottom: '4px' }}>{c.title}</div>
                {c.sub && <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>{c.sub}</div>}
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#64748b', textDecoration: 'line-through', marginBottom: '12px' }}>
                  {c.price}<span style={{ fontSize: '13px', fontWeight: 400 }}> {c.unit}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 2 }}>
                  {c.items.map(i => <li key={i}>❌ {i}</li>)}
                </ul>
              </div>
            ))}
            {/* VideoForge destaque */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(0,210,160,0.08), rgba(108,92,231,0.08))',
              border: '2px solid rgba(0,210,160,0.4)',
              borderRadius: '16px', padding: '28px 20px', textAlign: 'center',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 0 40px rgba(0,210,160,0.12)',
            }}>
              <div style={{
                position: 'absolute', top: '12px', right: '-24px', transform: 'rotate(45deg)',
                background: 'linear-gradient(135deg, #00d2a0, #00b894)', padding: '4px 32px',
                fontSize: '10px', fontWeight: 800, color: '#0a0a14',
              }}>MELHOR</div>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🚀</div>
              <div style={{ fontWeight: 800, fontSize: '16px', color: '#00d2a0', marginBottom: '8px' }}>VideoForge</div>
              <div style={{ fontSize: '36px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>
                R$ 59
              </div>
              <div style={{ fontSize: '14px', color: '#00d2a0', fontWeight: 600, marginBottom: '16px' }}>uma vez, para sempre</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 2 }}>
                <li>✅ Sem marca d'água</li>
                <li>✅ Vídeos ilimitados*</li>
                <li>✅ Pagamento único</li>
                <li>✅ Acesso vitalício</li>
              </ul>
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '10px', lineHeight: 1.5 }}>
                *Ferramentas core gratuitas. Recursos premium usam tokens de APIs externas.
              </p>
            </div>
          </div>

          <div style={{ marginTop: '48px' }}>
            <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="cta-green" onClick={() => handleCTAClick('comparativo_comprar')}>
              Quero Começar Agora — R$ 59 →
            </a>
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '14px' }}>
              🛡️ 7 dias de garantia · 🔒 Pagamento seguro via Hotmart
            </p>
          </div>
        </div>
      </section>

      {/* ═══ RECURSOS PRINCIPAIS ═══ */}
      <section id="recursos" data-animate style={{
        padding: '100px 24px', background: 'rgba(255,255,255,0.02)',
      }} className={`fade-section ${visibleSections['recursos'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>
            Tudo que você precisa para criar vídeos
          </h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '56px', fontSize: '16px' }}>
            Do roteiro ao upload — zero trabalho manual
          </p>
          <div className="features-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px',
          }}>
            {[
              { icon: '🤖', title: 'Roteiro com IA', desc: 'Gemini gera roteiros completos a partir de um tema. 100% grátis, sem custo de API.' },
              { icon: '🎤', title: '400+ Vozes Neurais', desc: 'Edge TTS com 400+ vozes em 100+ idiomas. Preview de voz, seleção por gênero e idioma. Tudo gratuito.' },
              { icon: '🎬', title: '8+ Tipos de Vídeo', desc: 'Notícias, listas, tutoriais, motivacional, dark, curiosidades e mais.' },
              { icon: '📸', title: '15+ APIs Integradas', desc: 'Pexels, Pixabay, Unsplash, Google Images, Stable Diffusion, DALL-E e mais.' },
              { icon: '📺', title: 'Upload Direto', desc: 'YouTube, TikTok, Twitter/X, Facebook, Instagram, LinkedIn — tudo de uma vez.' },
              { icon: '🔍', title: 'SEO Automático', desc: 'IA gera títulos, descrições e tags otimizadas para YouTube. Cada vídeo sai com SEO pronto.' },
              { icon: '🕵️', title: 'Análise de Canais', desc: 'Espione qualquer canal do YouTube: VPH, tags, engajamento, monetização e frequência de uploads.' },
              { icon: '📰', title: 'Notícias via RSS', desc: 'Crie vídeos de notícias automaticamente a partir de feeds RSS do seu nicho.' },
              { icon: '⭐', title: 'Review de Produto', desc: 'Gere vídeos de review automáticos com IA — prós, contras, nota e veredicto prontos.' },
              { icon: '📱', title: 'Social AI (Instagram)', desc: 'Automação completa do Instagram: análise de perfil, geração de conteúdo, calendário editorial e publicação automática com IA.' },
            ].map(f => (
              <div key={f.title} className="feature-card" style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px', padding: '28px',
              }}>
                <span style={{ fontSize: '36px', display: 'block', marginBottom: '16px' }}>{f.icon}</span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>{f.title}</h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ REVIEW DE PRODUTO COM IA ═══ */}
      <section id="review-produto" data-animate style={{
        padding: '100px 24px',
        background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.06), transparent 60%)',
      }} className={`fade-section ${visibleSections['review-produto'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', padding: '6px 16px', borderRadius: '99px', fontSize: '12px',
            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
            color: '#fbbf24', fontWeight: 700, marginBottom: '20px', letterSpacing: '1px',
          }}>NOVO</div>
          <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>
            Review de Produto — <span style={{ color: '#fbbf24' }}>100% Automático</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '56px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7 }}>
            Digite o nome do produto e a IA cria um vídeo completo de review: prós, contras, nota, público-alvo e veredicto final. Perfeito para canais de afiliados e nichos de tecnologia.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginBottom: '48px' }}>
            {[
              { icon: '📝', title: 'Roteiro Especializado', desc: 'A IA gera um roteiro de review profissional com estrutura de nota, prós/contras e comparativo.' },
              { icon: '⭐', title: 'Nota e Veredicto', desc: 'Cada review inclui avaliação de 1 a 5 estrelas e veredicto final automático — como um review real.' },
              { icon: '🎯', title: 'Público e Preço', desc: 'Define automaticamente para quem o produto é indicado e mostra faixa de preço no vídeo.' },
              { icon: '🚀', title: 'Pronto para Monetizar', desc: 'Ideal para marketing de afiliados — gere reviews em escala e monetize com links de afiliado.' },
            ].map(f => (
              <div key={f.title} className="feature-card" style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(251,191,36,0.12)',
                borderRadius: '16px', padding: '28px', textAlign: 'left',
              }}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '14px' }}>{f.icon}</span>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>{f.title}</h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Como funciona o review */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px', padding: '36px 28px', maxWidth: '640px', margin: '0 auto',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#fbbf24' }}>
              Como funciona em 3 passos
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
              {[
                { n: '1', text: 'Digite o nome do produto (ex: "iPhone 16 Pro Max")' },
                { n: '2', text: 'A IA pesquisa e gera o review completo com narração' },
                { n: '3', text: 'Receba o vídeo pronto — publique e monetize' },
              ].map(s => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#0a0a14', fontWeight: 800, fontSize: '14px',
                  }}>{s.n}</div>
                  <p style={{ fontSize: '15px', color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL AI — INSTAGRAM ═══ */}
      <section id="social-ai" data-animate style={{
        padding: '100px 24px',
        background: 'radial-gradient(ellipse at center, rgba(236,72,153,0.06), transparent 60%)',
      }} className={`fade-section ${visibleSections['social-ai'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', padding: '6px 16px', borderRadius: '99px', fontSize: '12px',
            background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.3)',
            color: '#ec4899', fontWeight: 700, marginBottom: '20px', letterSpacing: '1px',
          }}>NOVO</div>
          <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>
            Social AI — <span style={{ color: '#ec4899' }}>Instagram no Piloto Automático</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '56px', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7 }}>
            Conecte seu Instagram, deixe a IA analisar seu perfil e gere conteúdo, legendas, hashtags e calendário editorial automaticamente. Publique direto do VideoForge.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginBottom: '48px' }}>
            {[
              { icon: '🔍', title: 'Análise de Perfil com IA', desc: 'A IA analisa seus últimos posts, identifica melhores hashtags, horários e formatos que mais engajam.' },
              { icon: '✍️', title: 'Geração de Conteúdo', desc: 'Gere legendas, hashtags e roteiros de carrossel com um clique. Escolha o tom: profissional, descontraído ou inspirador.' },
              { icon: '📅', title: 'Calendário Editorial', desc: 'A IA cria um plano de publicação de 7, 15 ou 30 dias personalizado para o seu nicho.' },
              { icon: '📤', title: 'Publicação Automática', desc: 'Agende posts e a IA publica automaticamente no seu Instagram. Suporta imagens, carrossel e Reels.' },
              { icon: '🎬', title: 'Vídeo → Reels', desc: 'Converta qualquer vídeo criado no VideoForge em Reels do Instagram com legenda e hashtags geradas pela IA.' },
              { icon: '📊', title: 'Media Kit Automático', desc: 'Gere seu Media Kit profissional com estatísticas, engajamento e melhores posts — pronto para marcas.' },
            ].map(f => (
              <div key={f.title} className="feature-card" style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(236,72,153,0.12)',
                borderRadius: '16px', padding: '28px', textAlign: 'left',
              }}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '14px' }}>{f.icon}</span>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>{f.title}</h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px', padding: '36px 28px', maxWidth: '640px', margin: '0 auto',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#ec4899' }}>
              Como funciona em 3 passos
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
              {[
                { n: '1', text: 'Conecte seu Instagram profissional via Meta (Facebook)' },
                { n: '2', text: 'A IA analisa seu perfil e gera conteúdo personalizado' },
                { n: '3', text: 'Agende, publique e acompanhe tudo de um só lugar' },
              ].map(s => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #ec4899, #db2777)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: '14px',
                  }}>{s.n}</div>
                  <p style={{ fontSize: '15px', color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ NOVAS FUNCIONALIDADES PREMIUM ═══ */}
      <section id="premium" data-animate style={{
        padding: '100px 24px',
        background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.06), transparent 60%)',
      }} className={`fade-section ${visibleSections['premium'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', padding: '6px 16px', borderRadius: '99px', fontSize: '12px',
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
            color: '#818cf8', fontWeight: 700, marginBottom: '20px', letterSpacing: '1px',
          }}>NOVO</div>
          <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>
            Ferramentas que seus <span style={{ color: '#818cf8' }}>concorrentes não têm</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '56px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7 }}>
            SEO automático, 400+ vozes e espionagem de canais — tudo integrado.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '48px' }}>
            {[
              {
                icon: '🎭', title: 'Avatar Studio AI',
                desc: 'Crie avatares com IA, ative a webcam e grave vídeos com seu avatar personalizado apresentando conteúdo. Estilos: 2D Cartoon, 3D e Realista.',
                color: '#ec4899'
              },
              {
                icon: '🗣️', title: 'Talking Photo AI',
                desc: 'Envie a foto de qualquer pessoa e a IA anima o rosto com narração realista. Escolha a voz, escreva o texto e receba um vídeo MP4 pronto. 🟡 Requer tokens D-ID + OpenAI.',
                color: '#38bdf8'
              },
              {
                icon: '�🎙️', title: '400+ Vozes Neurais',
                desc: 'Escolha entre 400+ vozes em 100+ idiomas com preview ao vivo. Masculino, feminino, qualquer sotaque — tudo Edge TTS, 100% gratuito.',
                color: '#10b981'
              },
              {
                icon: '🔍', title: 'SEO Automático por IA',
                desc: 'A cada publicação no YouTube, a IA gera títulos, descrições e tags otimizadas automaticamente. Mais alcance com zero esforço.',
                color: '#f59e0b'
              },
              {
                icon: '🕵️', title: 'Inteligência de Canais',
                desc: 'Analise qualquer canal do YouTube: VPH (views/hora), tags mais usadas, taxa de engajamento, frequência de upload e status de monetização.',
                color: '#8b5cf6'
              },
            ].map(f => (
              <div key={f.title} className="feature-card" style={{
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${f.color}33`,
                borderRadius: '16px', padding: '32px', textAlign: 'left',
              }}>
                <span style={{ fontSize: '40px', display: 'block', marginBottom: '16px' }}>{f.icon}</span>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 10px', color: '#fff' }}>{f.title}</h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Transparency box */}
          <div style={{
            background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: '12px', padding: '20px 28px', textAlign: 'left', maxWidth: '700px',
            margin: '0 auto',
          }}>
            <p style={{ fontSize: '14px', color: '#fbbf24', fontWeight: 700, margin: '0 0 8px' }}>⚠️ Transparência sobre custos</p>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: 1.8 }}>
              <strong style={{ color: '#e2e8f0' }}>Grátis e ilimitado:</strong> Roteiro (Gemini), narração (Edge TTS 400+ vozes), imagens (Pexels/Pixabay), SEO, espionagem de canais, review de produto e todos os tipos de vídeo.<br />
              <strong style={{ color: '#e2e8f0' }}>Requer tokens externos (🟡):</strong> Talking Photo (D-ID + OpenAI), vozes premium (ElevenLabs/OpenAI). Você conecta sua própria chave de API e paga direto na plataforma — o VideoForge não cobra nada extra.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ PROVA SOCIAL / EXEMPLOS ═══ */}
      <section id="prova-social" data-animate style={{ padding: '100px 24px' }}
        className={`fade-section ${visibleSections['prova-social'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>
            Vídeos criados com VideoForge
          </h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '48px', fontSize: '16px' }}>
            Veja exemplos reais de vídeos gerados 100% por IA
          </p>

          {/* Video embed */}
          <div style={{ maxWidth: '680px', margin: '0 auto 48px' }}>
            <div style={{
              borderRadius: '16px', overflow: 'hidden',
              border: '1px solid rgba(108,92,231,0.3)',
              boxShadow: '0 4px 40px rgba(108,92,231,0.15)',
              aspectRatio: '16/9', position: 'relative',
            }}>
              <iframe
                width="100%" height="100%"
                src="https://www.youtube.com/embed/LX3Wi-Lwa9E?si=YoYtejlK13JFbs_2"
                title="Exemplo de vídeo criado com VideoForge"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                loading="lazy"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>

          {/* Depoimentos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              { nome: 'Ricardo M.', role: 'Criador de conteúdo', texto: 'Gero 5 vídeos por dia sem editar nada. O modo Stock Images com Gemini é insano — totalmente grátis!', stars: 5 },
              { nome: 'Ana Beatriz S.', role: 'Canal de curiosidades', texto: 'Automatizei meu canal de curiosidades 100%. O sistema de notícias automáticas me economiza horas todos os dias.', stars: 5 },
              { nome: 'Lucas Ferreira', role: 'Empreendedor digital', texto: 'Melhor investimento de R$59 que fiz. Já publiquei mais de 200 vídeos no YouTube no piloto automático.', stars: 5 },
            ].map(t => (
              <div key={t.nome} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px', padding: '28px',
              }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
                  {Array(t.stars).fill(null).map((_, i) => <span key={i} style={{ color: '#fbbf24', fontSize: '16px' }}>★</span>)}
                </div>
                <p style={{ fontSize: '15px', color: '#cbd5e1', lineHeight: 1.7, margin: '0 0 20px', fontStyle: 'italic' }}>
                  &ldquo;{t.texto}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '18px',
                  }}>{t.nome.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>{t.nome}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" data-animate style={{
        padding: '100px 24px', background: 'rgba(255,255,255,0.02)',
      }} className={`fade-section ${visibleSections['faq'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '36px', fontWeight: 800, marginBottom: '48px' }}>
            Perguntas frequentes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map(f => (
              <details key={f.q} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px', padding: '20px 24px',
              }}>
                <summary style={{
                  cursor: 'pointer', fontSize: '16px', fontWeight: 600, color: '#e2e8f0',
                  listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  {f.q}
                  <span style={{ color: '#6c5ce7', fontSize: '20px', flexShrink: 0, marginLeft: '12px' }}>+</span>
                </summary>
                <p style={{ fontSize: '15px', color: '#94a3b8', marginTop: '14px', lineHeight: 1.7, margin: '14px 0 0' }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SEÇÃO FINAL DE CONVERSÃO ═══ */}
      <section id="cta-final" data-animate style={{
        padding: '100px 24px', textAlign: 'center',
        background: 'radial-gradient(ellipse at center, rgba(108,92,231,0.1), transparent 60%)',
      }} className={`fade-section ${visibleSections['cta-final'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <img src="/logo.png" alt="VideoForge" style={{ width: '56px', height: '56px', borderRadius: '14px', marginBottom: '24px', filter: 'drop-shadow(0 0 20px rgba(108,92,231,0.4))' }} loading="lazy" />
          <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>
            Pronto para automatizar seus vídeos?
          </h2>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '20px', color: '#64748b', textDecoration: 'line-through' }}>R$ 197</span>
          </div>
          <div style={{ fontSize: '56px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>
            R$ {precos.preco_vitalicio || '59'}
          </div>
          <p style={{ color: '#00d2a0', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
            Pagamento único — acesso vitalício
          </p>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '40px' }}>
            🛡️ 7 dias para testar. Não gostou? Seu dinheiro de volta.
          </p>
          <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="cta-green" onClick={() => handleCTAClick('cta_final_comprar')}>
            Quero Começar Agora →
          </a>
          <p style={{ marginTop: '24px' }}>
            <a href="/afiliados" style={{ color: '#a29bfe', fontSize: '14px', textDecoration: 'none' }}>
              💰 Quer divulgar e ganhar 50% de comissão? <strong>Seja afiliado</strong>
            </a>
          </p>
        </div>
      </section>

      {/* ═══ STICKY BOTTOM CTA BAR ═══ */}
      {showStickyBar && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
          background: 'rgba(10,10,20,0.95)', backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(108,92,231,0.3)',
          padding: '12px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
          flexWrap: 'wrap', animation: 'fadeInUp 0.3s ease',
        }}>
          <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>
            <span style={{ textDecoration: 'line-through', color: '#64748b' }}>R$ 197</span>{' '}
            <strong style={{ color: '#fff', fontSize: '18px' }}>R$ {precos.preco_vitalicio || '59'}</strong>{' '}
            <span style={{ color: '#64748b' }}>— acesso vitalício</span>
          </span>
          <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" onClick={() => handleCTAClick('sticky_bar_comprar')} style={{
            padding: '10px 24px', borderRadius: '10px', textDecoration: 'none',
            background: 'linear-gradient(135deg, #00d2a0, #00b894)', color: '#0a0a14',
            fontWeight: 700, fontSize: '14px',
            boxShadow: '0 4px 16px rgba(0,210,160,0.4)',
          }}>
            Quero Começar Agora →
          </a>
          <span style={{
            padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
            background: 'rgba(0,210,160,0.1)', border: '1px solid rgba(0,210,160,0.3)', color: '#00d2a0',
          }}>
            🛡️ 7 dias de garantia
          </span>
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        padding: '48px 24px 100px', textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        color: '#4b5563', fontSize: '13px',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="footer-grid" style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <a href="/privacy" style={{ color: '#64748b', textDecoration: 'none' }}>Política de Privacidade</a>
            <a href="/terms" style={{ color: '#64748b', textDecoration: 'none' }}>Termos de Uso</a>
            <a href="/excluir" style={{ color: '#64748b', textDecoration: 'none' }}>Excluir Dados</a>
            <a href="/afiliados" style={{ color: '#fbbf24', textDecoration: 'none', fontWeight: 600 }}>Programa de Afiliados</a>
            <a href="mailto:eloi.santaroza@gmail.com" style={{ color: '#64748b', textDecoration: 'none' }}>eloi.santaroza@gmail.com</a>
          </div>
          <p style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '20px' }}>
            © 2026 VideoForge. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* ═══ EMAIL POPUP (Exit Intent) ═══ */}
      {showEmailPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeInUp 0.3s ease',
        }} onClick={() => setShowEmailPopup(false)}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            border: '1px solid rgba(108,92,231,0.3)',
            borderRadius: '20px', padding: '40px', maxWidth: '440px', width: '90%',
            textAlign: 'center', position: 'relative',
            boxShadow: '0 20px 60px rgba(108,92,231,0.3)',
          }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowEmailPopup(false)} style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'none', border: 'none', color: '#64748b',
              fontSize: '24px', cursor: 'pointer', padding: '4px',
            }}>×</button>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎁</div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 12px', color: '#fff' }}>
              Espera! Leva um presente
            </h3>
            <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '24px', lineHeight: 1.6 }}>
              Receba <strong style={{ color: '#a29bfe' }}>5 roteiros prontos</strong> para vídeos virais
              + dicas exclusivas de como crescer no YouTube com IA.
            </p>
            {emailSent ? (
              <div style={{
                padding: '20px', borderRadius: '12px',
                background: 'rgba(0,210,160,0.1)', border: '1px solid rgba(0,210,160,0.3)',
              }}>
                <p style={{ color: '#00d2a0', fontSize: '16px', fontWeight: 600, margin: 0 }}>
                  ✅ Pronto! Verifique seu e-mail.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="email" placeholder="Digite seu melhor e-mail"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                  style={{
                    padding: '14px 18px', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                    color: '#fff', fontSize: '16px', outline: 'none', textAlign: 'center',
                  }}
                />
                <button type="submit" style={{
                  padding: '14px 24px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', color: '#fff',
                  fontWeight: 700, fontSize: '16px', cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(108,92,231,0.5)',
                }}>
                  🚀 Quero os roteiros grátis!
                </button>
              </form>
            )}
            <p style={{ fontSize: '12px', color: '#4b5563', marginTop: '16px' }}>
              🔒 Seu e-mail está seguro. Sem spam, prometemos.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
