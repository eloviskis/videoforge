import { useState, useEffect } from 'react'

export default function SocialAIPage({ onGoBack, onGoLogin }) {
  const [visibleSections, setVisibleSections] = useState({})
  const [showTokenModal, setShowTokenModal] = useState(false)

  const HOTMART_URL = 'https://pay.hotmart.com/S104720959A?bid=1772552529640&utm_source=site&utm_medium=social-ai-page&utm_campaign=social-ai'

  useEffect(() => {
    window.scrollTo(0, 0)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) setVisibleSections(prev => ({ ...prev, [e.target.id]: true }))
      })
    }, { threshold: 0.1 })
    document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const css = `
    *{box-sizing:border-box}
    .fade-section{opacity:0;transform:translateY(30px);transition:all .7s ease}
    .fade-section.visible{opacity:1;transform:none}
    .cta-btn{display:inline-flex;align-items:center;gap:8px;padding:16px 36px;border:none;border-radius:14px;
      font-size:17px;font-weight:700;cursor:pointer;transition:all .3s;text-decoration:none;color:#fff}
    .cta-btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(236,72,153,0.35)}
    .cta-btn-outline{display:inline-flex;align-items:center;gap:8px;padding:14px 32px;border:2px solid rgba(236,72,153,0.4);
      border-radius:14px;font-size:16px;font-weight:600;cursor:pointer;transition:all .3s;
      text-decoration:none;color:#ec4899;background:transparent}
    .cta-btn-outline:hover{background:rgba(236,72,153,0.08);border-color:#ec4899}
    .step-card{background:rgba(255,255,255,0.03);border:1px solid rgba(236,72,153,0.1);border-radius:20px;
      padding:36px 28px;text-align:center;transition:all .3s}
    .step-card:hover{border-color:rgba(236,72,153,0.3);transform:translateY(-4px);
      box-shadow:0 12px 40px rgba(236,72,153,0.1)}
    .feat-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:18px;
      padding:32px 24px;text-align:left;transition:all .3s;position:relative;overflow:hidden}
    .feat-card:hover{border-color:rgba(236,72,153,0.2);transform:translateY(-2px)}
    .feat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;
      background:linear-gradient(90deg,#ec4899,#8b5cf6);opacity:0;transition:opacity .3s}
    .feat-card:hover::before{opacity:1}
    .comparison-row{display:grid;grid-template-columns:1fr 100px 100px;gap:0;border-bottom:1px solid rgba(255,255,255,0.06);
      padding:14px 0;align-items:center}
    .check{color:#22c55e;font-size:20px}.cross{color:#475569;font-size:20px}
    .pulse{animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
    @media(max-width:768px){
      .hero-grid{flex-direction:column!important;text-align:center!important}
      .steps-grid{grid-template-columns:1fr!important}
      .features-grid{grid-template-columns:1fr!important}
      .comparison-row{grid-template-columns:1fr 80px 80px}
      .hero-title{font-size:32px!important}
      .hero-sub{font-size:16px!important}
    }
  `

  return (
    <div style={{ background: '#0a0a14', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh' }}>
      <style>{css}</style>

      {/* ═══ TOP BAR ═══ */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10,10,20,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={onGoBack}>
            <span style={{ fontSize: '20px' }}>←</span>
            <span style={{ fontSize: '20px', fontWeight: 800 }}>🎬 Video<span style={{ color: '#8b5cf6' }}>Forge</span></span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onGoLogin} className="cta-btn-outline" style={{ padding: '8px 20px', fontSize: '14px' }}>Login</button>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowTokenModal(true) }} className="cta-btn"
              style={{ padding: '8px 24px', fontSize: '14px', background: 'linear-gradient(135deg, #ec4899, #db2777)' }}>
              Começar Agora
            </a>
          </div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section id="hero" data-animate style={{
        paddingTop: '140px', paddingBottom: '80px', padding: '140px 24px 80px',
        background: 'radial-gradient(ellipse at top center, rgba(236,72,153,0.12), transparent 60%)',
        position: 'relative',
      }} className={`fade-section ${visibleSections['hero'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px',
            borderRadius: '99px', fontSize: '13px', fontWeight: 700,
            background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.3)',
            color: '#ec4899', marginBottom: '28px', letterSpacing: '1px',
          }}>
            <span className="pulse">🔴</span> NOVO — Social AI
          </div>
          <h1 className="hero-title" style={{
            fontSize: '52px', fontWeight: 900, lineHeight: 1.1, marginBottom: '24px',
            background: 'linear-gradient(135deg, #fff, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Seu Instagram no<br />Piloto Automático com IA
          </h1>
          <p className="hero-sub" style={{
            fontSize: '19px', color: '#94a3b8', lineHeight: 1.7, maxWidth: '640px',
            margin: '0 auto 40px',
          }}>
            A inteligência artificial analisa seu perfil, cria conteúdo, gera legendas e hashtags,
            monta seu calendário editorial e <strong style={{ color: '#ec4899' }}>publica automaticamente</strong>. Tudo sem sair do VideoForge.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowTokenModal(true) }} className="cta-btn"
              style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)', fontSize: '18px', padding: '18px 40px' }}>
              🚀 Quero Automatizar Meu Instagram
            </a>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '16px' }}>
            ✅ Licença Vitalícia · ✅ 7 dias de garantia · ✅ Sem mensalidade
          </p>
        </div>
      </section>

      {/* ═══ O PROBLEMA ═══ */}
      <section id="problema" data-animate style={{
        padding: '80px 24px',
        background: 'rgba(0,0,0,0.3)',
      }} className={`fade-section ${visibleSections['problema'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '20px' }}>
            Você reconhece <span style={{ color: '#f87171' }}>esses problemas</span>?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left', maxWidth: '560px', margin: '0 auto' }}>
            {[
              'Perde horas pensando no que postar',
              'Nunca sabe o melhor horário para publicar',
              'Suas legendas não geram engajamento',
              'Não tem consistência — posta 3 dias e para 2 semanas',
              'Sente que está falando sozinho nos Stories',
              'Já tentou ferramentas caras que não entregam resultado',
            ].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px',
                background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.1)', borderRadius: '12px' }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>😩</span>
                <p style={{ margin: 0, fontSize: '15px', color: '#cbd5e1' }}>{t}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '40px', padding: '24px', background: 'rgba(236,72,153,0.05)',
            border: '1px solid rgba(236,72,153,0.15)', borderRadius: '16px' }}>
            <p style={{ margin: 0, fontSize: '18px', color: '#ec4899', fontWeight: 700 }}>
              E se uma IA fizesse tudo isso por você?
            </p>
          </div>
        </div>
      </section>

      {/* ═══ COMO FUNCIONA (PASSO A PASSO) ═══ */}
      <section id="passos" data-animate style={{
        padding: '100px 24px',
        background: 'radial-gradient(ellipse at center, rgba(236,72,153,0.04), transparent 60%)',
      }} className={`fade-section ${visibleSections['passos'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{
              display: 'inline-block', padding: '6px 16px', borderRadius: '99px', fontSize: '12px',
              background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.3)',
              color: '#ec4899', fontWeight: 700, marginBottom: '16px', letterSpacing: '1px',
            }}>PASSO A PASSO</div>
            <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>
              Como funciona o <span style={{ color: '#ec4899' }}>Social AI</span>
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '16px', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
              Em 4 passos simples, você transforma seu Instagram numa máquina de conteúdo.
            </p>
          </div>

          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' }}>
            {[
              {
                step: '1', icon: '🔗', title: 'Conecte seu Instagram',
                desc: 'Faça login via Meta (Facebook) com um clique. Conectamos com segurança à sua conta Instagram profissional ou de criador.',
                detail: 'OAuth seguro — nunca pedimos sua senha do Instagram',
              },
              {
                step: '2', icon: '🧠', title: 'A IA Analisa Tudo',
                desc: 'A inteligência artificial estuda seus posts recentes, identifica padrões de engajamento, melhores hashtags e horários.',
                detail: 'Análise completa com sugestões personalizadas',
              },
              {
                step: '3', icon: '✨', title: 'Gere Conteúdo com IA',
                desc: 'Gere legendas, hashtags, roteiros de carrossel, ideias de Reels e calendário editorial — tudo personalizado para você.',
                detail: 'Escolha o tom: profissional, descontraído ou inspirador',
              },
              {
                step: '4', icon: '📤', title: 'Publique ou Agende',
                desc: 'Publique direto no Instagram ou agende para o melhor horário. O sistema publica automaticamente quando chegar a hora.',
                detail: 'Suporta imagens, carrossel e Reels',
              },
            ].map(s => (
              <div key={s.step} className="step-card">
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%', margin: '0 auto 16px',
                  background: 'linear-gradient(135deg, #ec4899, #db2777)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', fontWeight: 900, color: '#fff',
                }}>
                  {s.step}
                </div>
                <span style={{ fontSize: '40px', display: 'block', marginBottom: '16px' }}>{s.icon}</span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px', color: '#fff' }}>{s.title}</h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 12px', lineHeight: 1.7 }}>{s.desc}</p>
                <div style={{
                  fontSize: '12px', color: '#ec4899', background: 'rgba(236,72,153,0.08)',
                  padding: '6px 12px', borderRadius: '8px', display: 'inline-block',
                }}>
                  💡 {s.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TODAS AS FUNCIONALIDADES ═══ */}
      <section id="funcionalidades" data-animate style={{
        padding: '100px 24px',
      }} className={`fade-section ${visibleSections['funcionalidades'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>
              Tudo que você precisa em <span style={{ color: '#ec4899' }}>um só lugar</span>
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '16px', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
              Cada ferramenta foi pensada para economizar seu tempo e aumentar seus resultados no Instagram.
            </p>
          </div>

          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              {
                icon: '🔍', title: 'Análise de Perfil com IA',
                desc: 'A IA analisa seus últimos posts, identifica padrões de engajamento, hashtags que funcionam, melhores horários e formatos que performam melhor. Receba 5+ sugestões práticas e personalizadas.',
                tag: 'Automático',
              },
              {
                icon: '✍️', title: 'Geração de Legendas',
                desc: 'Gere legendas profissionais para qualquer tipo de post: feed, carousel, Reels ou Stories. Escolha entre tons diferentes: profissional, descontraído, inspirador, humorístico ou educativo.',
                tag: 'IA Generativa',
              },
              {
                icon: '#️⃣', title: 'Hashtags Inteligentes',
                desc: 'A IA sugere hashtags relevantes para o seu nicho, mix de populares e de cauda longa para maximizar o alcance. Baseado em análise real do seu perfil.',
                tag: 'Otimizado',
              },
              {
                icon: '📅', title: 'Calendário Editorial',
                desc: 'Gere um plano completo de publicações para 7, 15 ou 30 dias. A IA define tipo de post, horário ideal, tema e legenda para cada dia. Exporte ou publique direto.',
                tag: '7-30 dias',
              },
              {
                icon: '📤', title: 'Publicação Automática',
                desc: 'Agende posts para qualquer dia e horário. O Social AI publica automaticamente no seu Instagram quando chegar a hora — mesmo se você estiver dormindo.',
                tag: 'Agendamento',
              },
              {
                icon: '🎬', title: 'Vídeo → Reels',
                desc: 'Transforme qualquer vídeo criado no VideoForge em um Reels do Instagram. A IA gera automaticamente legenda, hashtags e descrição otimizada para engajamento.',
                tag: 'Integrado',
              },
              {
                icon: '📊', title: 'Media Kit Automático',
                desc: 'Gere um Media Kit profissional com suas métricas, engajamento, melhores posts e dados do perfil. Pronto para enviar a marcas e fechar parcerias.',
                tag: 'Profissional',
              },
              {
                icon: '🎨', title: 'Multi-formato',
                desc: 'Crie conteúdo para todos os formatos: post de feed, carrossel, Reels, Stories. Cada formato recebe tratamento otimizado pela IA com as melhores práticas.',
                tag: 'Versátil',
              },
              {
                icon: '🔄', title: 'Reaproveitamento',
                desc: 'Transforme vídeos do VideoForge em posts de Instagram com um clique. A IA extrai o melhor momento, gera a legenda e prepara o post automaticamente.',
                tag: 'Smart',
              },
            ].map(f => (
              <div key={f.title} className="feat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <span style={{ fontSize: '36px' }}>{f.icon}</span>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px',
                    background: 'rgba(236,72,153,0.1)', color: '#ec4899', letterSpacing: '0.5px',
                  }}>{f.tag}</span>
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 10px', color: '#fff' }}>{f.title}</h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COMPARAÇÃO ═══ */}
      <section id="comparacao" data-animate style={{
        padding: '100px 24px',
        background: 'rgba(0,0,0,0.3)',
      }} className={`fade-section ${visibleSections['comparacao'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>
              Social AI vs. <span style={{ color: '#64748b' }}>fazer na mão</span>
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '15px' }}>
              Quanto tempo você economiza todo mês?
            </p>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '18px', padding: '28px', overflow: 'hidden',
          }}>
            {/* Header */}
            <div className="comparison-row" style={{ borderBottom: '2px solid rgba(236,72,153,0.2)', paddingBottom: '16px', fontWeight: 700 }}>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>TAREFA</span>
              <span style={{ textAlign: 'center', fontSize: '13px', color: '#ec4899' }}>Social AI</span>
              <span style={{ textAlign: 'center', fontSize: '13px', color: '#64748b' }}>Manual</span>
            </div>
            {[
              { task: 'Criar legenda de post', ai: '10 seg', manual: '20-40 min' },
              { task: 'Pesquisar hashtags', ai: 'Automático', manual: '15-30 min' },
              { task: 'Analisar perfil', ai: '1 clique', manual: '1-2 horas' },
              { task: 'Montar calendário semanal', ai: '30 seg', manual: '2-4 horas' },
              { task: 'Agendar 7 posts', ai: '2 min', manual: '30-60 min' },
              { task: 'Gerar roteiro carrossel', ai: '15 seg', manual: '1-2 horas' },
              { task: 'Criar Media Kit', ai: '1 clique', manual: '3-5 horas' },
            ].map(r => (
              <div key={r.task} className="comparison-row">
                <span style={{ fontSize: '14px', color: '#cbd5e1' }}>{r.task}</span>
                <span style={{ textAlign: 'center', fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>{r.ai}</span>
                <span style={{ textAlign: 'center', fontSize: '13px', color: '#f87171' }}>{r.manual}</span>
              </div>
            ))}
            <div style={{
              marginTop: '20px', padding: '16px', background: 'rgba(236,72,153,0.05)',
              borderRadius: '12px', textAlign: 'center',
            }}>
              <p style={{ margin: 0, fontSize: '15px', color: '#ec4899', fontWeight: 700 }}>
                ⏱️ Economia estimada: <span style={{ fontSize: '20px' }}>10-15 horas/semana</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PARA QUEM É ═══ */}
      <section id="para-quem" data-animate style={{
        padding: '100px 24px',
      }} className={`fade-section ${visibleSections['para-quem'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>
              Para quem é o <span style={{ color: '#ec4899' }}>Social AI</span>?
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
            {[
              { icon: '🎯', title: 'Criadores de Conteúdo', desc: 'Que querem crescer no Instagram sem gastar horas criando legendas e planejando posts.' },
              { icon: '🏪', title: 'Pequenos Negócios', desc: 'Que precisam de presença digital mas não têm verba para contratar um social media.' },
              { icon: '📈', title: 'Infoprodutores', desc: 'Que querem manter constância nas redes para atrair alunos e clientes para seus cursos.' },
              { icon: '🎨', title: 'Freelancers', desc: 'Designers, fotógrafos e profissionais que precisam de portfólio ativo no Instagram.' },
              { icon: '🏋️', title: 'Personal Trainers', desc: 'Profissionais de saúde que querem atrair clientes com conteúdo consistente.' },
              { icon: '🍕', title: 'Restaurantes e Lojas', desc: 'Estabelecimentos que precisam de presença digital mas não têm tempo para gerenciar.' },
            ].map(p => (
              <div key={p.title} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px', padding: '28px', textAlign: 'center',
              }}>
                <span style={{ fontSize: '40px', display: 'block', marginBottom: '16px' }}>{p.icon}</span>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>{p.title}</h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" data-animate style={{
        padding: '100px 24px',
        background: 'rgba(0,0,0,0.3)',
      }} className={`fade-section ${visibleSections['faq'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, textAlign: 'center', marginBottom: '48px' }}>
            Perguntas <span style={{ color: '#ec4899' }}>Frequentes</span>
          </h2>
          {[
            {
              q: 'Preciso ter conta profissional no Instagram?',
              a: 'Sim, o Social AI funciona com contas Instagram Profissional (Business) ou de Criador, que são vinculadas a uma página do Facebook. A conversão é gratuita e leva 2 minutos nas configurações do Instagram.',
            },
            {
              q: 'A IA vai postar automaticamente por mim?',
              a: 'Sim! Você pode agendar posts e o Social AI publica automaticamente no horário definido. Você também pode revisar e editar tudo antes da publicação.',
            },
            {
              q: 'Quais formatos de post são suportados?',
              a: 'Post de feed (imagem única), carrossel (múltiplas imagens), Reels (vídeos curtos) e Stories. A IA otimiza a legenda e hashtags para cada formato.',
            },
            {
              q: 'O Social AI funciona para qualquer nicho?',
              a: 'Sim! A IA se adapta ao seu nicho e estilo. Na análise de perfil, ela identifica seu tipo de conteúdo e gera sugestões contextualizadas, seja fitness, gastronomia, moda, tecnologia, educação, etc.',
            },
            {
              q: 'Tem algum custo mensal adicional?',
              a: 'Não! O Social AI está incluído na licença vitalícia do VideoForge. Você paga uma vez e usa para sempre, sem mensalidades ou limites de posts.',
            },
            {
              q: 'É seguro conectar minha conta?',
              a: 'Totalmente. Usamos o OAuth oficial da Meta (Facebook). Nunca pedimos sua senha do Instagram. Você pode desconectar sua conta a qualquer momento.',
            },
            {
              q: 'Posso usar em mais de uma conta do Instagram?',
              a: 'Cada usuário VideoForge conecta uma conta Instagram. Se você gerencia múltiplas contas, pode ter usuários separados para cada perfil.',
            },
            {
              q: 'Como funciona a garantia?',
              a: 'Você tem 7 dias de garantia incondicional via Hotmart. Se não gostar do VideoForge por qualquer motivo, solicite o reembolso e receba 100% do valor de volta.',
            },
          ].map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section id="cta-final" data-animate style={{
        padding: '100px 24px',
        background: 'radial-gradient(ellipse at center, rgba(236,72,153,0.1), transparent 60%)',
      }} className={`fade-section ${visibleSections['cta-final'] ? 'visible' : ''}`}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: '64px', display: 'block', marginBottom: '24px' }}>🚀</span>
          <h2 style={{ fontSize: '36px', fontWeight: 900, marginBottom: '16px' }}>
            Pare de perder tempo.<br />
            <span style={{ color: '#ec4899' }}>Deixe a IA trabalhar por você.</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '17px', lineHeight: 1.7, marginBottom: '40px', maxWidth: '520px', margin: '0 auto 40px' }}>
            Milhares de criadores já automatizaram seu Instagram com VideoForge.
            Comece agora e ganhe <strong style={{ color: '#22c55e' }}>horas do seu dia de volta</strong>.
          </p>
          <a href="#" onClick={(e) => { e.preventDefault(); setShowTokenModal(true) }} className="cta-btn"
            style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)', fontSize: '20px', padding: '20px 48px' }}>
            🎯 Quero o Social AI Agora
          </a>
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {['Licença Vitalícia', '7 dias de garantia', 'Sem mensalidade', 'Acesso imediato'].map(t => (
              <span key={t} style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#22c55e' }}>✓</span> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MODAL TOKENS ═══ */}
      {showTokenModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowTokenModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a2e', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '32px', border: '1px solid rgba(108,92,231,0.3)', animation: 'fadeInUp 0.3s ease' }}>
            <h3 style={{ color: '#fff', margin: '0 0 20px', fontSize: '22px', textAlign: 'center' }}>💡 Como funciona o VideoForge</h3>
            <div style={{ background: '#0d3320', border: '1px solid #22c55e', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <strong style={{ color: '#22c55e' }}>✅ Funções 100% GRATUITAS (incluídas no plano):</strong>
              <ul style={{ color: '#bbf7d0', margin: '8px 0 0', paddingLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
                <li>Roteiro automático com IA (Gemini)</li>
                <li>Narração profissional (Edge TTS — 400+ vozes)</li>
                <li>Imagens e vídeos stock ilimitados</li>
                <li>Social AI — calendário e posts automáticos</li>
                <li>Publicação automática no YouTube</li>
              </ul>
            </div>
            <div style={{ background: '#332800', border: '1px solid #eab308', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <strong style={{ color: '#fbbf24' }}>⚡ Funções PREMIUM (tokens de API externa):</strong>
              <p style={{ color: '#fef3c7', margin: '8px 0 0', fontSize: '13px', lineHeight: '1.7' }}>
                Algumas ferramentas avançadas usam APIs externas pagas (DALL-E, D-ID, Kling, Sora). <strong>O VideoForge não cobra nada extra</strong> — você conecta sua chave de API e paga diretamente à plataforma. A maioria dos usuários <strong>não precisa</strong> dessas ferramentas.
              </p>
            </div>
            <div style={{ background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.3)', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
              <strong style={{ color: '#a78bfa' }}>📌 Resumo:</strong>
              <p style={{ color: '#c4b5fd', margin: '8px 0 0', fontSize: '13px', lineHeight: '1.7' }}>
                Com pagamento único de <strong>R$ 59</strong> você tem <strong>acesso vitalício</strong> a tudo. Ferramentas premium são opcionais.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowTokenModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #4b5563', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Voltar</button>
              <button onClick={() => { setShowTokenModal(false); window.open(HOTMART_URL, '_blank') }} style={{ flex: 2, padding: '14px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #ec4899, #db2777)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '15px', boxShadow: '0 4px 16px rgba(236,72,153,0.3)' }}>✅ Entendi — Quero Comprar →</button>
            </div>
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', marginTop: '12px' }}>🛡️ 7 dias de garantia incondicional</p>
          </div>
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        padding: '40px 24px', borderTop: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
      }}>
        <p style={{ color: '#475569', fontSize: '13px', margin: '0 0 12px' }}>
          🎬 VideoForge — Social AI · © {new Date().getFullYear()}
        </p>
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>Página Inicial</a>
          <a href="/privacy" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>Privacidade</a>
          <a href="/terms" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>Termos de Uso</a>
          <a href="/excluir" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>Excluir Dados</a>
        </div>
      </footer>
    </div>
  )
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '4px',
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', background: 'none', border: 'none', padding: '20px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        cursor: 'pointer', color: '#e2e8f0', fontSize: '16px', fontWeight: 600,
        textAlign: 'left', fontFamily: 'inherit',
      }}>
        <span>{q}</span>
        <span style={{
          transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .2s',
          fontSize: '22px', color: '#ec4899', flexShrink: 0, marginLeft: '16px',
        }}>+</span>
      </button>
      {open && (
        <div style={{ padding: '0 0 20px', color: '#94a3b8', fontSize: '15px', lineHeight: 1.7 }}>
          {a}
        </div>
      )}
    </div>
  )
}
