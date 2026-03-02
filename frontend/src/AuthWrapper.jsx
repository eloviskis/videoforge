import { useState, useEffect } from 'react'
import axios from 'axios'
import App from './App.jsx'
import LoginPage from './LoginPage.jsx'
import LandingPage from './LandingPage.jsx'
import AdminPanel from './AdminPanel.jsx'
import MinhaConta from './MinhaConta.jsx'

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : (window.location.port === '3000'
    ? 'http://localhost:3001/api'
    : `${window.location.origin}/api`)

export default function AuthWrapper() {
  const [page, setPage] = useState('loading')   // loading | landing | login | app | admin
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [appInfo, setAppInfo] = useState({})
  const [showDownload, setShowDownload] = useState(false)

  /* ── ao montar, verifica se já tem token salvo ── */
  useEffect(() => {
    const saved = localStorage.getItem('vf_token')
    if (!saved) { setPage('landing'); return }

    // Configurar axios com token salvo
    axios.defaults.headers.common['Authorization'] = `Bearer ${saved}`

    fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${saved}` } })
      .then(r => {
        if (!r.ok) throw new Error('invalid')
        return r.json()
      })
      .then(data => {
        setToken(saved)
        setUser(data.user ?? data)
        setPage('app')
        // buscar info do app (versão, aviso tokens)
        fetch(`${API_URL}/download/info`)
          .then(r => r.json()).then(setAppInfo).catch(() => {})
      })
      .catch(() => {
        localStorage.removeItem('vf_token')
        localStorage.removeItem('vf_user')
        delete axios.defaults.headers.common['Authorization']
        setPage('landing')
      })
  }, [])

  /* ── interceptor: auto-logout on 401 ── */
  useEffect(() => {
    const id = axios.interceptors.response.use(
      r => r,
      err => {
        if (err.response?.status === 401 && page === 'app') {
          localStorage.removeItem('vf_token')
          localStorage.removeItem('vf_user')
          delete axios.defaults.headers.common['Authorization']
          setToken(null)
          setUser(null)
          setPage('landing')
        }
        return Promise.reject(err)
      }
    )
    return () => axios.interceptors.response.eject(id)
  }, [page])

  /* ── callbacks ── */
  function handleLogin(tkn, usr) {
    localStorage.setItem('vf_token', tkn)
    localStorage.setItem('vf_user', JSON.stringify(usr))
    axios.defaults.headers.common['Authorization'] = `Bearer ${tkn}`
    setToken(tkn)
    setUser(usr)
    setPage('app')
  }

  function handleLogout() {
    localStorage.removeItem('vf_token')
    localStorage.removeItem('vf_user')
    delete axios.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
    setPage('landing')
  }

  /* ── render ── */
  if (page === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0a1a', color: '#8b5cf6', fontSize: '18px', fontFamily: 'Inter, sans-serif'
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

  if (page === 'admin') {
    return <AdminPanel onBack={() => setPage('app')} />
  }

  if (page === 'settings') {
    return <MinhaConta onBack={() => setPage('app')} user={user} />
  }

  /* page === 'app' */
  return (
    <div>
      {/* ── barra de usuário ── */}
      <div style={{
        background: 'rgba(15,15,35,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: '12px', fontSize: '13px', color: '#94a3b8', fontFamily: 'Inter, sans-serif',
        flexWrap: 'wrap',
      }}>
        {user && (
          <>
            <span>👤 {user.nome || user.email}</span>
            <span style={{
              padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
              background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', textTransform: 'uppercase',
            }}>
              {user.plano || 'trial'}
            </span>
            <span style={{ color: '#64748b' }}>
              {user.videos_mes_usados ?? 0}/{user.videos_mes_limite ?? 5} vídeos
            </span>
            <span style={{ flex: 1 }} />

            {/* Download button */}
            <button
              onClick={() => setShowDownload(!showDownload)}
              style={{
                padding: '5px 14px', borderRadius: '6px', border: '1px solid rgba(34,197,94,0.3)',
                background: 'rgba(34,197,94,0.1)', color: '#86efac', cursor: 'pointer', fontSize: '12px',
                fontWeight: 600,
              }}
            >
              📥 Download App
            </button>

            {/* Minha Conta button */}
            <button
              onClick={() => setPage('settings')}
              style={{
                padding: '5px 14px', borderRadius: '6px', border: '1px solid rgba(139,92,246,0.3)',
                background: 'rgba(139,92,246,0.1)', color: '#c4b5fd', cursor: 'pointer', fontSize: '12px',
                fontWeight: 600,
              }}
            >
              ⚙️ Minha Conta
            </button>

            {/* Admin button (se is_admin) */}
            {user.is_admin && (
              <button
                onClick={() => setPage('admin')}
                style={{
                  padding: '5px 14px', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.3)',
                  background: 'rgba(245,158,11,0.1)', color: '#fcd34d', cursor: 'pointer', fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                🛡️ Admin
              </button>
            )}
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

      {/* ── Painel de Download ── */}
      {showDownload && (
        <div style={{
          background: 'rgba(15,15,35,0.98)', borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 24px', fontFamily: 'Inter, sans-serif', color: '#e2e8f0',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>📥 Download — VideoForge Desktop</h3>
              <button onClick={() => setShowDownload(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <div style={{
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: '12px', padding: '20px', marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '48px' }}>🖥️</div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700 }}>VideoForge para Windows</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                    Versão {appInfo.versao_app || '1.1.0'} — Instalador .exe (Setup)
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                    Inclui backend + frontend integrados. Roda localmente sem precisar de servidor.
                  </p>
                </div>
                <a
                  href={`${API_URL}/download/installer`}
                  onClick={e => {
                    e.preventDefault()
                    const a = document.createElement('a')
                    a.href = `${API_URL}/download/installer`
                    // adicionar token como header via fetch
                    fetch(`${API_URL}/download/installer`, {
                      headers: { Authorization: `Bearer ${token}` }
                    }).then(r => {
                      if (!r.ok) throw new Error('Erro ao baixar')
                      return r.blob()
                    }).then(blob => {
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `VideoForge-Setup-${appInfo.versao_app || '1.1.0'}.exe`
                      a.click()
                      URL.revokeObjectURL(url)
                    }).catch(err => alert('Erro ao baixar: ' + err.message))
                  }}
                  style={{
                    padding: '10px 24px', borderRadius: '10px', textDecoration: 'none',
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
                    fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap',
                    boxShadow: '0 4px 15px rgba(139,92,246,0.3)',
                  }}
                >
                  ⬇️ Baixar .exe
                </a>
              </div>
            </div>

            {/* Aviso sobre tokens pagos */}
            <div style={{
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '12px', padding: '16px',
            }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#fcd34d' }}>
                ⚠️ Importante sobre custos de IA
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.7 }}>
                {appInfo.aviso_tokens || 'Alguns modos de geração usam APIs de IA pagas (Replicate, Kling, Veo, Sora). O custo varia por provedor e duração do vídeo. Modos gratuitos: Stock Images e Stick Animation.'}
              </p>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'rgba(34,197,94,0.15)', color: '#86efac' }}>
                  🟢 Grátis: Stock Images, Stick Animation
                </span>
                <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'rgba(245,158,11,0.15)', color: '#fcd34d' }}>
                  🟡 Freemium: HuggingFace, Replicate
                </span>
                <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>
                  🔴 Pago: Kling, Veo, Sora, D-ID
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <App />
    </div>
  )
}
