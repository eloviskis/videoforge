import { useState, useEffect } from 'react'

export default function LoginPage({ onLogin, onGoLanding }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkoutUrl, setCheckoutUrl] = useState('')

  const API = window.location.port === '3000' ? 'http://localhost:3001' : ''

  useEffect(() => {
    fetch(`${API}/api/public/precos`)
      .then(r => r.json())
      .then(data => {
        if (data.hotmart_checkout_vitalicio) setCheckoutUrl(data.hotmart_checkout_vitalicio)
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })
      const data = await r.json()

      if (!r.ok) {
        setErro(data.error || 'Erro desconhecido')
        return
      }

      // Salvar token e dados do usuário
      localStorage.setItem('vf_token', data.token)
      localStorage.setItem('vf_user', JSON.stringify(data.user))
      onLogin(data.token, data.user)
    } catch (err) {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        margin: '0 16px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/logo.png" alt="VideoForge" style={{
            width: '80px', height: '80px', borderRadius: '18px', marginBottom: '12px',
            filter: 'drop-shadow(0 0 25px rgba(139,92,246,0.45))',
          }} />
          <h1 style={{
            fontSize: '36px', fontWeight: 800, color: '#fff',
            margin: '0 0 6px',
            background: 'linear-gradient(135deg, #8b5cf6, #a855f7, #c084fc)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            VideoForge
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            Crie vídeos com IA automaticamente
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          {/* Header */}
          <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 700, color: '#e2e8f0', margin: '0 0 24px' }}>
            Entrar na sua conta
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required autoFocus
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.15)', outline: 'none',
                  background: 'rgba(255,255,255,0.06)', color: '#fff',
                  fontSize: '14px', boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>
                Senha
              </label>
              <input
                type="password" value={senha} onChange={e => setSenha(e.target.value)}
                placeholder="••••••••" required minLength={6}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.15)', outline: 'none',
                  background: 'rgba(255,255,255,0.06)', color: '#fff',
                  fontSize: '14px', boxSizing: 'border-box',
                }}
              />
            </div>

            {erro && (
              <div style={{
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px', padding: '10px 14px', color: '#fca5a5',
                fontSize: '13px',
              }}>
                ❌ {erro}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
                background: loading ? '#4b5563' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                color: '#fff', fontWeight: 700, fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(139,92,246,0.5)',
              }}
            >
              {loading ? '⏳ Aguarde...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Links */}
        <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
            Ainda não tem conta?{' '}
            <a href={checkoutUrl || '/#precos'} target={checkoutUrl ? '_blank' : undefined} rel="noopener noreferrer" style={{ color: '#a855f7', fontWeight: 600, textDecoration: 'none' }}>
              Compre aqui e receba acesso automático
            </a>
          </p>
          <button
            onClick={onGoLanding}
            style={{
              background: 'none', border: 'none', color: '#c4b5fd',
              cursor: 'pointer', fontSize: '13px', textDecoration: 'underline',
            }}
          >
            ← Ver planos e preços
          </button>
        </div>
      </div>
    </div>
  )
}
