export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎬</div>
        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 5rem)',
          fontWeight: 900,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 1.5rem',
          lineHeight: 1.1,
        }}>
          VideoForge
        </h1>
        <p style={{
          fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
          color: '#94a3b8',
          maxWidth: '640px',
          lineHeight: 1.6,
          marginBottom: '2.5rem',
        }}>
          Crie, edite e publique vídeos profissionais com Inteligência Artificial.
          Do roteiro ao upload — totalmente automatizado.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="https://github.com/videoforge/videoforge/releases" style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
            padding: '0.9rem 2rem',
            borderRadius: '0.75rem',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '1.1rem',
            transition: 'opacity .2s',
          }}>
            ⬇ Baixar para Windows
          </a>
          <a href="#features" style={{
            background: 'rgba(255,255,255,0.08)',
            color: '#e2e8f0',
            padding: '0.9rem 2rem',
            borderRadius: '0.75rem',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1.1rem',
            border: '1px solid rgba(255,255,255,0.12)',
          }}>
            Ver funcionalidades
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '5rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Tudo que você precisa
        </h2>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '1.1rem', marginBottom: '3rem' }}>
          Uma plataforma completa para criadores de conteúdo
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}>
          {[
            { icon: '✍️', title: 'Roteiro com IA', desc: 'Gere roteiros completos e envolventes automaticamente com Gemini AI.' },
            { icon: '🎙️', title: 'Narração Realista', desc: 'Vozes naturais com ElevenLabs TTS. Escolha o tom, ritmo e emoção.' },
            { icon: '📹', title: 'Geração de Vídeo', desc: 'Cenas geradas por Kling AI, Wan2.1 e DALL-E integrados.' },
            { icon: '📝', title: 'Legendas Automáticas', desc: 'Transcrição e sincronização com Whisper AI em segundos.' },
            { icon: '✂️', title: 'Cortes Inteligentes', desc: 'Detecta os melhores momentos do vídeo pela barra do YouTube e publica como Shorts.' },
            { icon: '🚀', title: 'Publicação Direta', desc: 'Publique no YouTube e TikTok sem sair do app.' },
          ].map((f) => (
            <div key={f.title} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '1rem',
              padding: '1.75rem',
              transition: 'border-color .2s',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{f.icon}</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        textAlign: 'center',
        padding: '5rem 2rem',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>
          Pronto para criar?
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '2rem' }}>
          Baixe o VideoForge gratuitamente e comece hoje.
        </p>
        <a href="https://github.com/videoforge/videoforge/releases" style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff',
          padding: '1rem 2.5rem',
          borderRadius: '0.75rem',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: '1.15rem',
        }}>
          ⬇ Download gratuito
        </a>
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '2rem',
        color: '#475569',
        fontSize: '0.9rem',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <a href="/privacy" style={{ color: '#6366f1', textDecoration: 'none', marginRight: '1.5rem' }}>Política de Privacidade</a>
          <a href="/terms" style={{ color: '#6366f1', textDecoration: 'none' }}>Termos de Uso</a>
        </div>
        © {new Date().getFullYear()} VideoForge. Todos os direitos reservados.
      </footer>
    </main>
  )
}
