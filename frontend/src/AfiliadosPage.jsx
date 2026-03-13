import { useState } from 'react'

export default function AfiliadosPage({ onGoBack }) {
  const [copied, setCopied] = useState(false)

  const hotmartAfiliadoUrl = 'https://app-vlc.hotmart.com/market/details?productId=5804977'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1035 50%, #0a0a1a 100%)',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#e2e8f0',
    }}>
      {/* Header */}
      <header style={{
        padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>🎬</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>VideoForge</span>
        </div>
        <button onClick={onGoBack} style={{
          background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
          color: '#c4b5fd', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer',
          fontSize: '14px', fontWeight: 600,
        }}>
          ← Voltar
        </button>
      </header>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '60px 24px 40px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-block', padding: '6px 16px', borderRadius: '99px', fontSize: '13px', fontWeight: 600,
          background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24',
          marginBottom: '20px',
        }}>
          💰 PROGRAMA DE AFILIADOS
        </div>
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, lineHeight: 1.1,
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
        }}>
          Ganhe 50% de Comissão<br />Divulgando o VideoForge
        </h1>
        <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto 32px', lineHeight: 1.6 }}>
          Indique o VideoForge e receba <strong style={{ color: '#fbbf24' }}>metade do valor de cada venda</strong>. 
          Comissão vitalícia, sem limite de ganhos.
        </p>
        <a href={hotmartAfiliadoUrl} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-block', padding: '16px 40px', borderRadius: '12px', textDecoration: 'none',
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#0a0a14',
          fontWeight: 700, fontSize: '18px',
          boxShadow: '0 4px 24px rgba(251,191,36,0.4)',
          transition: 'transform 0.2s',
        }}>
          Quero Ser Afiliado na Hotmart →
        </a>
      </section>

      {/* Como Funciona */}
      <section style={{ padding: '40px 24px 60px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '40px' }}>
          Como Funciona?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          {[
            { step: '1', icon: '📝', title: 'Cadastre-se na Hotmart', desc: 'Crie sua conta gratuita na Hotmart e solicite afiliação ao VideoForge.' },
            { step: '2', icon: '🔗', title: 'Pegue seu Link', desc: 'Receba seu link exclusivo de afiliado com rastreamento automático.' },
            { step: '3', icon: '📢', title: 'Divulgue', desc: 'Compartilhe nas redes sociais, blog, YouTube, WhatsApp ou onde preferir.' },
            { step: '4', icon: '💸', title: 'Receba 50%', desc: 'A cada venda pelo seu link, você ganha 50% de comissão direto na Hotmart.' },
          ].map(item => (
            <div key={item.step} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', padding: '28px', textAlign: 'center',
              transition: 'border-color 0.3s',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: '20px', fontWeight: 800, color: '#0a0a14',
              }}>
                {item.step}
              </div>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{item.title}</h3>
              <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tema WordPress */}
      <section style={{
        padding: '60px 24px', maxWidth: '900px', margin: '0 auto',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(99,102,241,0.1))',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '20px', padding: '40px 32px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
          <div style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 700,
            background: 'rgba(0,210,160,0.15)', border: '1px solid rgba(0,210,160,0.3)', color: '#00d2a0',
            marginBottom: '16px', letterSpacing: '0.5px',
          }}>
            EXCLUSIVO PARA AFILIADOS
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>
            Tema WordPress Pronto para Divulgação
          </h2>
          <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto 24px', lineHeight: 1.7 }}>
            Disponibilizamos um <strong style={{ color: '#c4b5fd' }}>tema WordPress profissional e otimizado</strong> para 
            você criar seu site de divulgação do VideoForge em minutos. Landing page pronta, 
            textos persuasivos, integração com seu link de afiliado e design moderno.
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px',
            maxWidth: '650px', margin: '0 auto 28px',
          }}>
            {[
              { icon: '⚡', text: 'Instalação em 5 minutos' },
              { icon: '📱', text: '100% responsivo' },
              { icon: '🔍', text: 'SEO otimizado' },
              { icon: '🎯', text: 'Textos de venda prontos' },
              { icon: '🔗', text: 'Integração com link de afiliado' },
              { icon: '🎨', text: 'Design profissional dark' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 16px',
                fontSize: '14px', color: '#e2e8f0',
              }}>
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
            Solicite o tema gratuitamente após se tornar afiliado.
          </p>
          <a href="mailto:eloi.santaroza@gmail.com?subject=Quero%20o%20Tema%20WordPress%20-%20Afiliado%20VideoForge&body=Ol%C3%A1!%20Sou%20afiliado%20do%20VideoForge%20e%20gostaria%20de%20receber%20o%20tema%20WordPress%20para%20divulga%C3%A7%C3%A3o."
            style={{
              display: 'inline-block', padding: '14px 32px', borderRadius: '12px', textDecoration: 'none',
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff',
              fontWeight: 700, fontSize: '16px',
              boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
            }}>
            📧 Solicitar Tema WordPress
          </a>
        </div>
      </section>

      {/* Vantagens */}
      <section style={{ padding: '40px 24px 60px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '40px' }}>
          Por que Divulgar o VideoForge?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          {[
            { icon: '💰', title: '50% de Comissão', desc: 'Uma das maiores comissões do mercado. Cada venda = metade pra você.' },
            { icon: '♾️', title: 'Comissão Vitalícia', desc: 'Sem prazo de expiração. Seu link rende pra sempre.' },
            { icon: '🎯', title: 'Produto que Vende', desc: 'Vídeos com IA é tendência. O mercado cresce todo dia.' },
            { icon: '📊', title: 'Material Pronto', desc: 'Tema WordPress, banners, textos e criativos prontos para você usar.' },
            { icon: '⚡', title: 'Pagamento Rápido', desc: 'Receba automaticamente via Hotmart, sem burocracia.' },
            { icon: '🌍', title: 'Sem Limites', desc: 'Venda para o Brasil inteiro. Sem limite de indicações ou ganhos.' },
          ].map((item, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px', padding: '24px',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>{item.icon}</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{item.title}</h3>
              <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section style={{
        padding: '60px 24px', textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
          Comece a Ganhar Agora
        </h2>
        <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
          Cadastro gratuito, sem taxa, sem compromisso. Comece a divulgar e receba 50% de cada venda.
        </p>
        <a href={hotmartAfiliadoUrl} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-block', padding: '16px 48px', borderRadius: '12px', textDecoration: 'none',
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#0a0a14',
          fontWeight: 700, fontSize: '18px',
          boxShadow: '0 4px 24px rgba(251,191,36,0.4)',
        }}>
          Quero Ser Afiliado →
        </a>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '32px 24px', textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        color: '#4b5563', fontSize: '13px',
      }}>
        <p>© 2026 VideoForge. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
