import { useState, useEffect } from 'react'
import App from './App.jsx'
import LoginPage from './LoginPage.jsx'
import LandingPage from './LandingPage.jsx'

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : (window.location.port === '3000'
    ? 'http://localhost:3001/api'
    : `${window.location.origin}/api`)

export default function AuthWrapper() {
  const [page, setPage] = useState('loading')   // loading | landing | login | app
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  /* ── ao montar, verifica se já tem token salvo ── */
  useEffect(() => {
    const saved = localStorage.getItem('vf_token')
    if (!saved) { setPage('landing'); return }

    fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${saved}` } })
      .then(r => {
        if (!r.ok) throw new Error('invalid')
        return r.json()
      })
      .then(data => {
        setToken(saved)
        setUser(data.user ?? data)
        setPage('app')
      })
      .catch(() => {
        localStorage.removeItem('vf_token')
        localStorage.removeItem('vf_user')
        setPage('landing')
      })
  }, [])

  /* ── callbacks ── */
  function handleLogin(tkn, usr) {
    localStorage.setItem('vf_token', tkn)
    localStorage.setItem('vf_user', JSON.stringify(usr))
    setToken(tkn)
    setUser(usr)
    setPage('app')
  }

  function handleLogout() {
    localStorage.removeItem('vf_token')
    localStorage.removeItem('vf_user')
    setToken(null)
    setUser(null)
    setPage('landing')
  }

  /* ── render ── */
  if (page === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0a1a', color: '#6366f1', fontSize: '18px', fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'spin 1s linear infinite' }}>🎬</div>
          <p>Carregando...</p>
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )
  }

  if (page === 'landing') {
    return <LandingPage onGoLogin={() => setPage('login')} />
  }

  if (page === 'login') {
    return (
      <LoginPage
        onLogin={handleLogin}
        onGoLanding={() => setPage('landing')}
      />
    )
  }

  /* page === 'app' */
  return (
    <div>
      {/* ── barra de usuário ── */}
      <div style={{
        background: 'rgba(15,15,35,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: '16px', fontSize: '13px', color: '#94a3b8', fontFamily: 'Inter, sans-serif',
      }}>
        {user && (
          <>
            <span>👤 {user.nome || user.email}</span>
            <span style={{
              padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
              background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', textTransform: 'uppercase',
            }}>
              {user.plano || 'trial'}
            </span>
            <span style={{ color: '#64748b' }}>
              {user.videos_mes_usados ?? 0}/{user.videos_mes_limite ?? 5} vídeos
            </span>
          </>
        )}
        <button
          onClick={handleLogout}
          style={{
            padding: '5px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '12px',
            fontWeight: 600,
          }}
        >
          Sair
        </button>
      </div>
      <App />
    </div>
  )
}
