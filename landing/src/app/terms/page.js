export const metadata = {
  title: 'Termos de Uso — VideoForge',
  description: 'Termos de uso do VideoForge.',
}

export default function Terms() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', lineHeight: 1.8 }}>
      <a href="/" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.9rem' }}>← Voltar</a>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '1.5rem 0 0.5rem' }}>
        Termos de Uso
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '3rem' }}>Última atualização: 27 de fevereiro de 2025</p>

      <Section title="1. Aceitação dos Termos">
        Ao usar o VideoForge, você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize o aplicativo.
      </Section>

      <Section title="2. Uso Permitido">
        O VideoForge é fornecido para uso pessoal e comercial na criação de conteúdo de vídeo. Você concorda em:
        <ul>
          <li>Usar o aplicativo de acordo com as leis aplicáveis;</li>
          <li>Respeitar os Termos de Serviço das plataformas integradas (YouTube, TikTok, etc.);</li>
          <li>Não utilizar o aplicativo para criar conteúdo ilegal, enganoso ou que viole direitos de terceiros.</li>
        </ul>
      </Section>

      <Section title="3. Responsabilidade do Conteúdo">
        Você é inteiramente responsável pelo conteúdo criado e publicado através do VideoForge. O VideoForge não monitora, revisa ou endossa nenhum conteúdo gerado pelos usuários.
      </Section>

      <Section title="4. Serviços de Terceiros">
        O VideoForge utiliza APIs de terceiros. O uso dessas APIs está sujeito aos termos de serviço de cada provedor. Você é responsável por obter e manter as credenciais necessárias.
      </Section>

      <Section title="5. Limitação de Responsabilidade">
        O VideoForge é fornecido "como está", sem garantias. Não nos responsabilizamos por danos diretos ou indiretos decorrentes do uso do aplicativo.
      </Section>

      <Section title="6. Alterações">
        Podemos atualizar estes termos periodicamente. O uso continuado do aplicativo após alterações constitui aceitação dos novos termos.
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
