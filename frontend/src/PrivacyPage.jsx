export default function PrivacyPage({ onGoBack }) {
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
        <h1 style={s.h1}>Política de Privacidade</h1>
        <p style={s.updated}>Última atualização: 16 de março de 2026</p>

        <h2 style={s.h2}>1. Informações que Coletamos</h2>
        <p style={s.p}>Coletamos as seguintes informações quando você utiliza o VideoForge:</p>
        <ul style={s.ul}>
          <li style={s.li}>Nome e endereço de e-mail (cadastro)</li>
          <li style={s.li}>Dados de compra processados pela Hotmart (não armazenamos dados de cartão)</li>
          <li style={s.li}>Chaves de API que você configura voluntariamente (armazenadas de forma criptografada)</li>
          <li style={s.li}>Tokens OAuth de redes sociais que você conectar (YouTube, Instagram, etc.)</li>
          <li style={s.li}>Dados de uso do software (tipos de vídeo criados, configurações)</li>
        </ul>

        <h2 style={s.h2}>2. Como Usamos suas Informações</h2>
        <p style={s.p}>Utilizamos suas informações exclusivamente para:</p>
        <ul style={s.ul}>
          <li style={s.li}>Fornecer e manter o serviço VideoForge</li>
          <li style={s.li}>Autenticar seu acesso e gerenciar sua conta</li>
          <li style={s.li}>Processar solicitações de publicação em redes sociais conectadas</li>
          <li style={s.li}>Melhorar o software com base em dados agregados e anônimos</li>
          <li style={s.li}>Enviar comunicações sobre atualizações do produto (com opção de cancelamento)</li>
        </ul>

        <h2 style={s.h2}>3. Compartilhamento de Dados</h2>
        <p style={s.p}>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de marketing. Seus dados podem ser compartilhados apenas com:</p>
        <ul style={s.ul}>
          <li style={s.li}><strong style={{ color: '#e2e8f0' }}>Hotmart:</strong> processamento de pagamento e verificação de licença</li>
          <li style={s.li}><strong style={{ color: '#e2e8f0' }}>APIs externas:</strong> apenas quando você configura e utiliza integrações (Google/YouTube, Meta/Instagram, etc.) — usando suas próprias credenciais</li>
        </ul>

        <h2 style={s.h2}>4. Armazenamento e Segurança</h2>
        <p style={s.p}>
          Seus dados são armazenados em servidores seguros. Chaves de API e tokens de acesso são criptografados. 
          Utilizamos HTTPS em todas as comunicações e autenticação via JWT com expiração.
        </p>

        <h2 style={s.h2}>5. Seus Direitos (LGPD)</h2>
        <p style={s.p}>De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:</p>
        <ul style={s.ul}>
          <li style={s.li}>Acessar seus dados pessoais</li>
          <li style={s.li}>Corrigir dados incompletos ou incorretos</li>
          <li style={s.li}>Solicitar a exclusão dos seus dados</li>
          <li style={s.li}>Revogar seu consentimento a qualquer momento</li>
          <li style={s.li}>Solicitar a portabilidade dos seus dados</li>
        </ul>

        <h2 style={s.h2}>6. Cookies</h2>
        <p style={s.p}>
          Utilizamos cookies e armazenamento local (localStorage) apenas para manter sua sessão de login 
          e preferências de uso. Não utilizamos cookies de rastreamento de terceiros.
        </p>

        <h2 style={s.h2}>7. Exclusão de Dados</h2>
        <p style={s.p}>
          Você pode solicitar a exclusão completa dos seus dados a qualquer momento. 
          Ao excluir sua conta, todos os dados pessoais, vídeos, configurações e tokens são permanentemente removidos dos nossos servidores.
        </p>
        <p style={s.p}>
          Para solicitar exclusão, acesse <a href="/excluir" style={s.email}>videoforge.tech/excluir</a> ou 
          envie um e-mail para <a href="mailto:eloi.santaroza@gmail.com" style={s.email}>eloi.santaroza@gmail.com</a>.
        </p>

        <h2 style={s.h2}>8. Contato</h2>
        <p style={s.p}>
          Para dúvidas sobre esta política ou sobre o tratamento dos seus dados, entre em contato: <br />
          <a href="mailto:eloi.santaroza@gmail.com" style={s.email}>eloi.santaroza@gmail.com</a>
        </p>
      </div>
    </div>
  )
}
