import { useState } from 'react'

export default function LoginPage({ onLogin, onGoLanding }) {
  const [modo, setModo] = useState('login') // login | register
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const API = window.location.port === '3000' ? 'http://localhost:3001' : ''

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    try {
      const endpoint = modo === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = modo === 'login'
        ? { email, senha }
        : { email, senha, nome }

      const r = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '3px' }}>
            <button
              onClick={() => { setModo('login'); setErro('') }}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '14px',
                background: modo === 'login' ? '#8b5cf6' : 'transparent',
                color: modo === 'login' ? '#fff' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >Entrar</button>
            <button
              onClick={() => { setModo('register'); setErro('') }}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '14px',
                background: modo === 'register' ? '#8b5cf6' : 'transparent',
                color: modo === 'register' ? '#fff' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >Criar conta</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {modo === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>
                  Nome
                </label>
                <input
                  type="text" value={nome} onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.15)', outline: 'none',
                    background: 'rgba(255,255,255,0.06)', color: '#fff',
                    fontSize: '14px', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

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
              {loading ? '⏳ Aguarde...' : (modo === 'login' ? 'Entrar' : 'Criar conta')}
            </button>
          </form>
        </div>

        {/* Link para Landing */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
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
