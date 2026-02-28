const LAST_UPDATED = '27 de fevereiro de 2025'

export const metadata = {
  title: 'Política de Privacidade — VideoForge',
  description: 'Política de privacidade do VideoForge.',
}

export default function Privacy() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', lineHeight: 1.8 }}>
      <a href="/" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.9rem' }}>← Voltar</a>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '1.5rem 0 0.5rem' }}>
        Política de Privacidade
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '3rem' }}>Última atualização: {LAST_UPDATED}</p>

      <Section title="1. Introdução">
        O VideoForge ("nós", "nosso") é um aplicativo desktop para Windows que automatiza a criação e publicação de vídeos com inteligência artificial. Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas informações quando você utiliza nosso aplicativo.
      </Section>

      <Section title="2. Dados que Coletamos">
        <ul>
          <li><strong>Credenciais de APIs:</strong> Chaves de API fornecidas pelo usuário (Google, ElevenLabs, Kling AI, TikTok, etc.) são armazenadas localmente no computador do usuário em arquivo .env e nunca transmitidas a nossos servidores.</li>
          <li><strong>Tokens de autenticação OAuth:</strong> Tokens do YouTube e TikTok obtidos via OAuth 2.0 são armazenados temporariamente na memória do aplicativo durante a sessão.</li>
          <li><strong>Conteúdo gerado:</strong> Roteiros, vídeos e áudios criados ficam armazenados localmente no computador do usuário.</li>
        </ul>
      </Section>

      <Section title="3. Uso das Informações">
        As informações coletadas são utilizadas exclusivamente para:
        <ul>
          <li>Autenticar com plataformas de terceiros (YouTube, TikTok) mediante autorização explícita do usuário;</li>
          <li>Gerar conteúdo de vídeo utilizando APIs de IA conforme solicitado pelo usuário;</li>
          <li>Publicar conteúdo nas plataformas autorizadas pelo usuário.</li>
        </ul>
      </Section>

      <Section title="4. Compartilhamento de Dados">
        Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, exceto quando necessário para fornecer os serviços solicitados (ex.: envio de conteúdo ao YouTube ou TikTok mediante sua autorização).
      </Section>

      <Section title="5. Integrações com Terceiros">
        O VideoForge se integra com plataformas de terceiros mediante autorização explícita do usuário:
        <ul>
          <li><strong>TikTok:</strong> Via TikTok Login Kit e Content Posting API. Consulte a <a href="https://www.tiktok.com/legal/privacy-policy" style={{ color: '#6366f1' }}>Política de Privacidade do TikTok</a>.</li>
          <li><strong>YouTube/Google:</strong> Via Google OAuth 2.0. Consulte a <a href="https://policies.google.com/privacy" style={{ color: '#6366f1' }}>Política de Privacidade do Google</a>.</li>
        </ul>
      </Section>

      <Section title="6. Segurança">
        Todas as credenciais são armazenadas localmente no computador do usuário. Não mantemos servidores próprios com dados de usuários. A segurança das credenciais depende da segurança do computador do próprio usuário.
      </Section>

      <Section title="7. Seus Direitos">
        Você pode revogar o acesso do VideoForge às suas contas a qualquer momento:
        <ul>
          <li>YouTube: <a href="https://myaccount.google.com/permissions" style={{ color: '#6366f1' }}>google.com/permissions</a></li>
          <li>TikTok: Configurações da conta → Permissões de apps</li>
        </ul>
      </Section>

      <Section title="8. Contato">
        Para dúvidas sobre esta política, abra uma issue em nosso repositório no GitHub ou entre em contato via email disponível no perfil do projeto.
      </Section>
    </main>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.75rem' }}>{title}</h2>
      <div style={{ color: '#94a3b8' }}>{children}</div>
    </div>
  )
}
