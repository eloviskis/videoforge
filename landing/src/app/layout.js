export const metadata = {
  title: 'VideoForge — Criação de Vídeos com IA',
  description: 'VideoForge automatiza a criação, edição e publicação de vídeos com inteligência artificial. Gere roteiros, narrações, legendas e cortes automáticos.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#0a0a0f', color: '#fff' }}>
        {children}
      </body>
    </html>
  )
}
