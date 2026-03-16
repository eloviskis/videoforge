export default function TermsPage({ onGoBack }) {
  const s = {
    page: { minHeight: '100vh', background: '#0a0a1a', fontFamily: 'Inter, system-ui, sans-serif', color: '#e2e8f0' },
    header: { padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    btn: { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 },
    content: { maxWidth: '800px', margin: '0 auto', padding: '48px 24px 80px' },
    h1: { fontSize: '36px', fontWeight: 800, color: '#fff', marginBottom: '8px' },
    updated: { fontSize: '14px', color: '#64748b', marginBottom: '40px' },
    h2: { fontSize: '22px', fontWeight: 700, color: '#fff', margin: '36px 0 12px' },
    p: { fontSize: '15px', color: '#94a3b8', lineHeight: 1.8, margin: '0 0 16px' },
    ul: { paddingLeft: '24px', margin: '0 0 16px' },
    li: { fontSize: '15px', color: '#94a3b8', lineHeight: 1.8, marginBottom: '6px' },
    email: { color: '#a29bfe', textDecoration: 'none' },
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
        <h1 style={s.h1}>Termos de Uso</h1>
        <p style={s.updated}>Última atualização: 16 de março de 2026</p>

        <h2 style={s.h2}>1. Aceitação dos Termos</h2>
        <p style={s.p}>
          Ao acessar ou utilizar o VideoForge, você concorda com estes Termos de Uso. 
          Se não concordar com algum dos termos, não utilize o serviço.
        </p>

        <h2 style={s.h2}>2. Descrição do Serviço</h2>
        <p style={s.p}>
          O VideoForge é uma plataforma de criação automática de vídeos com inteligência artificial. 
          O serviço permite gerar roteiros, narração, edição e publicação de vídeos em plataformas como YouTube e Instagram.
        </p>

        <h2 style={s.h2}>3. Licença de Uso</h2>
        <ul style={s.ul}>
          <li style={s.li}>A licença do VideoForge é <strong style={{ color: '#e2e8f0' }}>pessoal, intransferível e vitalícia</strong> (plano único).</li>
          <li style={s.li}>Você pode usar o software para fins pessoais e comerciais (criar e monetizar vídeos).</li>
          <li style={s.li}>É proibido redistribuir, revender, sublicenciar ou modificar o código-fonte do VideoForge.</li>
          <li style={s.li}>Cada licença é válida para <strong style={{ color: '#e2e8f0' }}>1 (um) usuário</strong>.</li>
        </ul>

        <h2 style={s.h2}>4. Conteúdo Gerado</h2>
        <p style={s.p}>
          Os vídeos e conteúdos criados com o VideoForge são de propriedade do usuário. 
          O VideoForge não reivindica direitos sobre o conteúdo gerado.
        </p>
        <p style={s.p}>
          O usuário é responsável por garantir que o conteúdo gerado está em conformidade com as leis aplicáveis, 
          diretrizes das plataformas de publicação e direitos autorais de terceiros.
        </p>

        <h2 style={s.h2}>5. APIs e Serviços de Terceiros</h2>
        <p style={s.p}>
          O VideoForge integra-se com serviços de terceiros (Google Gemini, Edge TTS, Pexels, YouTube, Instagram, etc.). 
          O uso desses serviços está sujeito aos termos e políticas de cada plataforma.
        </p>
        <ul style={s.ul}>
          <li style={s.li}>Funcionalidades gratuitas (Gemini, Edge TTS, Pexels/Pixabay) não têm custo adicional.</li>
          <li style={s.li}>Funcionalidades premium (D-ID, ElevenLabs, OpenAI) requerem tokens/créditos das respectivas plataformas e são de responsabilidade do usuário.</li>
          <li style={s.li}>O VideoForge não se responsabiliza por alterações de preços, limites ou termos de serviços externos.</li>
        </ul>

        <h2 style={s.h2}>6. Pagamento e Reembolso</h2>
        <ul style={s.ul}>
          <li style={s.li}>O pagamento é processado exclusivamente pela <strong style={{ color: '#e2e8f0' }}>Hotmart</strong>.</li>
          <li style={s.li}>Oferecemos <strong style={{ color: '#00d2a0' }}>7 dias de garantia</strong> incondicional — solicite o reembolso pela Hotmart sem perguntas.</li>
          <li style={s.li}>Após o período de garantia, não são aceitos pedidos de reembolso.</li>
        </ul>

        <h2 style={s.h2}>7. Uso Proibido</h2>
        <p style={s.p}>É proibido usar o VideoForge para:</p>
        <ul style={s.ul}>
          <li style={s.li}>Criar conteúdo ilegal, difamatório, discriminatório ou que viole direitos de terceiros.</li>
          <li style={s.li}>Tentativas de acesso não autorizado ao sistema ou a contas de outros usuários.</li>
          <li style={s.li}>Automatizar spam ou ações que violem os termos das plataformas de publicação.</li>
          <li style={s.li}>Revenda ou sublicenciamento do acesso ao VideoForge.</li>
        </ul>

        <h2 style={s.h2}>8. Limitação de Responsabilidade</h2>
        <p style={s.p}>
          O VideoForge é fornecido "como está". Não garantimos disponibilidade ininterrupta, 
          resultados específicos de monetização ou compatibilidade permanente com serviços de terceiros. 
          Não nos responsabilizamos por perdas decorrentes do uso do software.
        </p>

        <h2 style={s.h2}>9. Cancelamento e Exclusão</h2>
        <p style={s.p}>
          Você pode solicitar a exclusão da sua conta e dados a qualquer momento. 
          Ao excluir, todos os dados, vídeos e configurações serão permanentemente removidos.
          Acesse <a href="/excluir" style={s.email}>videoforge.tech/excluir</a> para solicitar a exclusão.
        </p>

        <h2 style={s.h2}>10. Alterações nos Termos</h2>
        <p style={s.p}>
          Podemos atualizar estes termos periodicamente. Alterações significativas serão comunicadas por e-mail 
          ou notificação no software. O uso continuado após alterações constitui aceitação dos novos termos.
        </p>

        <h2 style={s.h2}>11. Contato</h2>
        <p style={s.p}>
          Para dúvidas sobre estes termos: <a href="mailto:eloi.santaroza@gmail.com" style={s.email}>eloi.santaroza@gmail.com</a>
        </p>
      </div>
    </div>
  )
}
