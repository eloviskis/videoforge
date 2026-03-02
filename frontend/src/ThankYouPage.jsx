import { useState, useEffect } from 'react'

export default function ThankYouPage({ onGoLogin }) {
  const [copied, setCopied] = useState(null)

  // Extrair parâmetros da URL (Hotmart envia via query string)
  const params = new URLSearchParams(window.location.search)
  const email = params.get('email') || ''
  const senha = params.get('senha') || ''
  const plano = params.get('plano') || 'vitalício'
  const nome = params.get('nome') || ''

  function copiar(texto, campo) {
    navigator.clipboard.writeText(texto).then(() => {
      setCopied(campo)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const cardStyle = {
    background: 'rgba(139,92,246,0.08)',
    border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '16px',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #1a103a 0%, #0a0a1a 60%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: '#fff',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        textAlign: 'center',
      }}>

        {/* Confetti emoji */}
        <div style={{ fontSize: '64px', marginBottom: '8px', animation: 'bounceIn 0.6s ease-out' }}>
          🎉
        </div>

        {/* Título */}
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #8b5cf6, #a855f7, #c084fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 8px',
        }}>
          Compra Aprovada!
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '16px', margin: '0 0 32px', lineHeight: 1.6 }}>
          {nome ? `Bem-vindo(a), ${nome}! ` : ''}Seu acesso ao <strong style={{ color: '#a855f7' }}>VideoForge</strong> está ativo.
          {plano && <><br />Plano: <strong style={{ color: '#22c55e' }}>{plano}</strong></>}
        </p>

        {/* Credenciais */}
        {(email || senha) && (
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#c084fc' }}>
              🔑 Suas Credenciais de Acesso
            </h3>

            {email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '12px 16px' }}>
                <span style={{ fontSize: '13px', color: '#64748b', minWidth: '50px' }}>Email</span>
                <span style={{ flex: 1, fontSize: '15px', fontWeight: 600, color: '#e2e8f0', wordBreak: 'break-all' }}>{email}</span>
                <button
                  onClick={() => copiar(email, 'email')}
                  style={{
                    background: copied === 'email' ? '#22c55e' : 'rgba(139,92,246,0.3)',
                    border: 'none', borderRadius: '8px', padding: '6px 12px',
                    color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                >
                  {copied === 'email' ? '✓ Copiado' : '📋 Copiar'}
                </button>
              </div>
            )}

            {senha && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '12px 16px' }}>
                <span style={{ fontSize: '13px', color: '#64748b', minWidth: '50px' }}>Senha</span>
                <span style={{ flex: 1, fontSize: '15px', fontWeight: 600, color: '#e2e8f0', fontFamily: 'monospace', letterSpacing: '1px' }}>{senha}</span>
                <button
                  onClick={() => copiar(senha, 'senha')}
                  style={{
                    background: copied === 'senha' ? '#22c55e' : 'rgba(139,92,246,0.3)',
                    border: 'none', borderRadius: '8px', padding: '6px 12px',
                    color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                >
                  {copied === 'senha' ? '✓ Copiado' : '📋 Copiar'}
                </button>
              </div>
            )}

            <p style={{ color: '#f59e0b', fontSize: '12px', margin: '14px 0 0', lineHeight: 1.5 }}>
              ⚠️ Anote sua senha! Você pode alterá-la depois em "Minha Conta".
            </p>
          </div>
        )}

        {/* Se não veio credenciais na URL */}
        {!email && !senha && (
          <div style={cardStyle}>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', lineHeight: 1.6 }}>
              📧 Suas credenciais de acesso foram enviadas para o email cadastrado na Hotmart.
              <br />Verifique sua caixa de entrada (e spam).
            </p>
          </div>
        )}

        {/* Próximos passos */}
        <div style={{ ...cardStyle, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, color: '#22c55e' }}>
            ✅ Próximos Passos
          </h3>
          <div style={{ textAlign: 'left', fontSize: '14px', color: '#cbd5e1', lineHeight: 1.8 }}>
            <div>1️⃣ Clique no botão abaixo para fazer login</div>
            <div>2️⃣ Vá em <strong>⚙️ Minha Conta</strong> e configure suas API Keys (Gemini é grátis!)</div>
            <div>3️⃣ Digite um tema e clique em <strong>🎬 Gerar Vídeo</strong></div>
            <div>4️⃣ Pronto! Seu vídeo será gerado automaticamente 🚀</div>
          </div>
        </div>

        {/* Botão entrar */}
        <button
          onClick={() => {
            // Limpar query string da URL
            window.history.replaceState({}, '', window.location.pathname)
            onGoLogin()
          }}
          style={{
            width: '100%',
            padding: '16px 32px',
            fontSize: '17px',
            fontWeight: 700,
            color: '#fff',
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            border: 'none',
            borderRadius: '14px',
            cursor: 'pointer',
            marginTop: '8px',
            boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 30px rgba(139,92,246,0.5)' }}
          onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 20px rgba(139,92,246,0.4)' }}
        >
          🚀 Entrar na Plataforma
        </button>

        {/* Suporte */}
        <p style={{ color: '#475569', fontSize: '12px', marginTop: '24px', lineHeight: 1.5 }}>
          Dúvidas? Dentro da plataforma use o 💬 Muro de Sugestões ou entre em contato por email.
        </p>

        {/* Animação */}
        <style>{`
          @keyframes bounceIn {
            0% { transform: scale(0.3); opacity: 0; }
            50% { transform: scale(1.1); }
            70% { transform: scale(0.95); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  )
}
