import { useState } from 'react'

export default function DeleteAccountPage({ onGoBack }) {
  const API_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : (window.location.port === '3000' ? 'http://localhost:3001/api' : `${window.location.origin}/api`)

  const [email, setEmail] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [status, setStatus] = useState(null) // null | 'sending' | 'sent' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  const canSubmit = email && confirmText === 'EXCLUIR' && status !== 'sending'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setStatus('sending')
    try {
      const res = await fetch(`${API_URL}/public/delete-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao processar solicitação')
      }
      setStatus('sent')
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  const s = {
    page: { minHeight: '100vh', background: '#0a0a1a', fontFamily: 'Inter, system-ui, sans-serif', color: '#e2e8f0' },
    header: { padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    btn: { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 },
    content: { maxWidth: '600px', margin: '0 auto', padding: '48px 24px 80px' },
    h1: { fontSize: '36px', fontWeight: 800, color: '#fff', marginBottom: '8px' },
    p: { fontSize: '15px', color: '#94a3b8', lineHeight: 1.8, margin: '0 0 16px' },
    input: { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
    label: { display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 },
  }

  if (status === 'sent') {
    return (
      <div style={s.page}>
        <header style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>🎬</span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>VideoForge</span>
          </div>
          <button onClick={onGoBack} style={s.btn}>← Voltar</button>
        </header>
        <div style={{ ...s.content, textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>📧</div>
          <h1 style={{ ...s.h1, fontSize: '28px' }}>Solicitação Enviada</h1>
          <p style={{ ...s.p, maxWidth: '500px', margin: '16px auto' }}>
            Recebemos sua solicitação de exclusão de dados. Você receberá um e-mail de confirmação em até <strong style={{ color: '#fff' }}>48 horas</strong>.
          </p>
          <p style={s.p}>
            Após a confirmação, todos os seus dados serão permanentemente removidos dos nossos servidores.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>🎬</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>VideoForge</span>
        </div>
        <button onClick={onGoBack} style={s.btn}>← Voltar</button>
      </header>

      <div style={s.content}>
        <h1 style={s.h1}>Exclusão de Dados</h1>
        <p style={{ ...s.p, marginBottom: '32px' }}>
          Em conformidade com a LGPD (Lei Geral de Proteção de Dados) e as políticas da Meta, 
          você pode solicitar a exclusão completa dos seus dados pessoais do VideoForge.
        </p>

        <div style={{
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '12px', padding: '20px', marginBottom: '32px',
        }}>
          <p style={{ fontSize: '14px', color: '#f87171', fontWeight: 700, margin: '0 0 8px' }}>⚠️ Atenção — esta ação é irreversível</p>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>
            Ao solicitar a exclusão, os seguintes dados serão permanentemente removidos:
          </p>
          <ul style={{ paddingLeft: '20px', margin: '12px 0 0' }}>
            <li style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.8 }}>Conta e dados de perfil</li>
            <li style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.8 }}>Tokens de redes sociais conectadas (YouTube, Instagram, etc.)</li>
            <li style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.8 }}>Chaves de API configuradas</li>
            <li style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.8 }}>Vídeos, roteiros e configurações salvas</li>
            <li style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.8 }}>Posts e calendários do Social AI</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={s.label}>E-mail da sua conta</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              style={s.input}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={s.label}>
              Digite <strong style={{ color: '#f87171' }}>EXCLUIR</strong> para confirmar
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="EXCLUIR"
              style={s.input}
            />
          </div>

          {status === 'error' && (
            <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>
              ❌ {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
              background: canSubmit ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(255,255,255,0.05)',
              color: canSubmit ? '#fff' : '#64748b',
              fontSize: '16px', fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {status === 'sending' ? 'Enviando...' : 'Solicitar Exclusão de Dados'}
          </button>
        </form>

        <p style={{ ...s.p, marginTop: '32px', fontSize: '13px', textAlign: 'center' }}>
          Você também pode solicitar por e-mail: <a href="mailto:eloi.santaroza@gmail.com" style={{ color: '#a29bfe', textDecoration: 'none' }}>eloi.santaroza@gmail.com</a>
        </p>
      </div>
    </div>
  )
}
