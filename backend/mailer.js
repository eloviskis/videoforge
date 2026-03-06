import nodemailer from 'nodemailer';

// ═══════════════════════════════════════════
// MÓDULO DE ENVIO DE EMAIL — VideoForge
// ═══════════════════════════════════════════

// Configuração do transporter (Gmail por padrão)
function criarTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = port === 465;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user || !pass) {
    console.warn('⚠️ SMTP_USER/SMTP_PASS não configurados — emails não serão enviados');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = criarTransporter();
  }
  return transporter;
}

// ─── Enviar email de boas-vindas após compra ───
export async function enviarEmailBoasVindas({ email, nome, senha, plano }) {
  const t = getTransporter();
  if (!t) {
    console.warn('⚠️ Email não enviado (SMTP não configurado):', email);
    return false;
  }

  const fromName = process.env.SMTP_FROM_NAME || 'VideoForge';
  const fromEmail = process.env.SMTP_USER || 'noreply@videoforge.tech';
  const appUrl = process.env.APP_BASE_URL || 'https://videoforge.tech';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#8b5cf6;font-size:32px;margin:0 0 8px;">🎬 VideoForge</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0;">Automação de Vídeos com IA</p>
    </div>

    <!-- Card principal -->
    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(139,92,246,0.3);border-radius:16px;padding:32px;margin-bottom:24px;">
      <h2 style="color:#e2e8f0;font-size:24px;margin:0 0 16px;">
        🎉 Bem-vindo${nome ? `, ${nome}` : ''}!
      </h2>
      <p style="color:#cbd5e1;font-size:16px;line-height:1.6;margin:0 0 24px;">
        Sua compra foi confirmada! Seu acesso <strong style="color:#a855f7;">${plano || 'vitalício'}</strong> ao VideoForge está ativo.
      </p>

      <!-- Credenciais -->
      <div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.25);border-radius:12px;padding:24px;margin-bottom:24px;">
        <h3 style="color:#c4b5fd;font-size:16px;margin:0 0 16px;">🔐 Seus dados de acesso</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#94a3b8;font-size:14px;padding:8px 0;width:80px;">Email:</td>
            <td style="color:#fff;font-size:14px;padding:8px 0;font-weight:600;">${email}</td>
          </tr>
          <tr>
            <td style="color:#94a3b8;font-size:14px;padding:8px 0;">Senha:</td>
            <td style="color:#fcd34d;font-size:16px;padding:8px 0;font-weight:700;font-family:monospace;letter-spacing:2px;">${senha}</td>
          </tr>
        </table>
      </div>

      <!-- Botão -->
      <div style="text-align:center;">
        <a href="${appUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:16px;">
          Acessar VideoForge →
        </a>
      </div>
    </div>

    <!-- Primeiros passos -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:24px;margin-bottom:24px;">
      <h3 style="color:#e2e8f0;font-size:16px;margin:0 0 16px;">🚀 Primeiros passos</h3>
      <ol style="color:#94a3b8;font-size:14px;line-height:2;margin:0;padding:0 0 0 20px;">
        <li>Acesse <a href="${appUrl}" style="color:#a855f7;">${appUrl}</a> e faça login</li>
        <li>Vá em ⚙️ <strong style="color:#e2e8f0;">Minha Conta</strong> e configure sua chave Gemini (grátis)</li>
        <li>Clique em <strong style="color:#e2e8f0;">Gerar Vídeo</strong> e digite um tema</li>
        <li>Pronto! Seu vídeo será gerado automaticamente</li>
      </ol>
    </div>

    <!-- Dica -->
    <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#86efac;font-size:14px;margin:0;line-height:1.6;">
        💡 <strong>Dica:</strong> Os modos <strong>Stock Images</strong> e <strong>Stick Animation</strong> são 100% gratuitos! 
        Use Gemini (gratuito) + Edge TTS (gratuito) para gerar vídeos sem custo adicional.
      </p>
    </div>

    <!-- Segurança -->
    <p style="color:#64748b;font-size:12px;text-align:center;margin:0 0 8px;">
      ⚠️ Recomendamos alterar sua senha após o primeiro login em ⚙️ Minha Conta.
    </p>

    <!-- Footer -->
    <div style="text-align:center;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="color:#4b5563;font-size:12px;margin:0;">
        © 2026 VideoForge — Automação de Vídeos com IA<br>
        <a href="${appUrl}/privacy" style="color:#6b7280;text-decoration:none;">Política de Privacidade</a> · 
        <a href="${appUrl}/terms" style="color:#6b7280;text-decoration:none;">Termos de Uso</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  const textContent = `
🎬 VideoForge — Bem-vindo${nome ? `, ${nome}` : ''}!

Sua compra foi confirmada! Seu acesso ${plano || 'vitalício'} está ativo.

🔐 Seus dados de acesso:
Email: ${email}
Senha: ${senha}

Acesse: ${appUrl}

Primeiros passos:
1. Acesse ${appUrl} e faça login
2. Configure sua chave Gemini (grátis) em Minha Conta
3. Clique em Gerar Vídeo e digite um tema
4. Pronto!

Dica: Os modos Stock Images e Stick Animation são 100% gratuitos!

⚠️ Recomendamos alterar sua senha após o primeiro login.

© 2026 VideoForge
`;

  try {
    await t.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: '🎬 VideoForge — Acesso liberado! Aqui estão seus dados de login',
      text: textContent,
      html: htmlContent,
    });
    console.log(`📧 Email de boas-vindas enviado para: ${email}`);
    return true;
  } catch (err) {
    console.error(`❌ Erro ao enviar email para ${email}:`, err.message);
    return false;
  }
}

// ─── Enviar notificação de feedback/sugestão para admin ───
export async function enviarEmailFeedback({ userEmail, userNome, tipo, titulo, mensagem }) {
  const t = getTransporter();
  if (!t) {
    console.warn('⚠️ Email de feedback não enviado (SMTP não configurado)');
    return false;
  }

  const fromName = process.env.SMTP_FROM_NAME || 'VideoForge';
  const fromEmail = process.env.SMTP_USER || 'noreply@videoforge.tech';
  const adminEmail = process.env.SMTP_USER || 'eloi.santaroza@gmail.com';
  const appUrl = process.env.APP_BASE_URL || 'https://videoforge.tech';

  const tipoLabel = { sugestao: '💡 Sugestão', bug: '🐛 Bug', elogio: '⭐ Elogio', outro: '📝 Outro' }[tipo] || tipo;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#8b5cf6;font-size:28px;margin:0;">🎬 VideoForge</h1>
      <p style="color:#94a3b8;font-size:14px;margin:4px 0 0;">Novo Feedback Recebido</p>
    </div>

    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(139,92,246,0.3);border-radius:16px;padding:32px;">
      <div style="display:flex;align-items:center;margin-bottom:20px;">
        <span style="background:rgba(139,92,246,0.15);color:#c4b5fd;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;">${tipoLabel}</span>
      </div>

      <h2 style="color:#e2e8f0;font-size:20px;margin:0 0 8px;">${titulo}</h2>

      <div style="background:rgba(255,255,255,0.03);border-left:3px solid #8b5cf6;border-radius:0 8px 8px 0;padding:16px 20px;margin:16px 0;">
        <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0;white-space:pre-wrap;">${mensagem}</p>
      </div>

      <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">
        <p style="color:#94a3b8;font-size:13px;margin:0;">
          👤 <strong style="color:#e2e8f0;">${userNome || 'Sem nome'}</strong> &nbsp;·&nbsp; ${userEmail}
        </p>
      </div>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="${appUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
        Abrir Painel Admin →
      </a>
    </div>

    <p style="color:#4b5563;font-size:11px;text-align:center;margin-top:24px;">
      Notificação automática do VideoForge
    </p>
  </div>
</body>
</html>`;

  try {
    await t.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: adminEmail,
      subject: `${tipoLabel} — ${titulo}`,
      text: `Novo feedback de ${userNome || userEmail} (${tipo}):\n\n${titulo}\n\n${mensagem}`,
      html: htmlContent,
    });
    console.log(`📧 Email de feedback enviado para admin: ${titulo}`);
    return true;
  } catch (err) {
    console.error(`❌ Erro ao enviar email de feedback:`, err.message);
    return false;
  }
}

// ─── Enviar email para lead (roteiros grátis + dicas) ───
export async function enviarEmailLead({ email }) {
  const t = getTransporter();
  if (!t) {
    console.warn('⚠️ Email de lead não enviado (SMTP não configurado):', email);
    return false;
  }

  const fromName = process.env.SMTP_FROM_NAME || 'VideoForge';
  const fromEmail = process.env.SMTP_USER || 'noreply@videoforge.tech';
  const appUrl = process.env.APP_BASE_URL || 'https://videoforge.tech';
  const checkoutUrl = 'https://pay.hotmart.com/S104720959A?bid=1772552529640';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#8b5cf6;font-size:32px;margin:0 0 8px;">🎬 VideoForge</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0;">Automação de Vídeos com IA</p>
    </div>

    <!-- Card principal -->
    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(139,92,246,0.3);border-radius:16px;padding:32px;margin-bottom:24px;">
      <h2 style="color:#e2e8f0;font-size:22px;margin:0 0 16px;">
        🎁 Seus 5 roteiros prontos chegaram!
      </h2>
      <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Obrigado por se cadastrar! Aqui estão <strong style="color:#c4b5fd;">5 roteiros prontos</strong> para vídeos virais que você pode usar agora mesmo no VideoForge.
      </p>

      <!-- Roteiro 1 -->
      <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:20px;margin-bottom:16px;">
        <h3 style="color:#c4b5fd;font-size:15px;margin:0 0 8px;">📹 Roteiro 1 — "5 Fatos Sobre o Espaço que Ninguém Te Contou"</h3>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">
          Nicho: Curiosidades · Duração: ~2 min · Modo: Stock Images<br>
          <em>Cole esse tema no VideoForge e ele gera o vídeo completo automaticamente.</em>
        </p>
      </div>

      <!-- Roteiro 2 -->
      <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:20px;margin-bottom:16px;">
        <h3 style="color:#c4b5fd;font-size:15px;margin:0 0 8px;">📹 Roteiro 2 — "3 Maneiras de Ganhar Dinheiro Online em 2026"</h3>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">
          Nicho: Finanças · Duração: ~3 min · Modo: Stock Images<br>
          <em>Vídeos de finanças têm CPM alto no YouTube — ótimo para monetização.</em>
        </p>
      </div>

      <!-- Roteiro 3 -->
      <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:20px;margin-bottom:16px;">
        <h3 style="color:#c4b5fd;font-size:15px;margin:0 0 8px;">📹 Roteiro 3 — "O Que Acontece Se Você Não Dormir por 72 Horas"</h3>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">
          Nicho: Ciência/Saúde · Duração: ~2 min · Modo: Stock Images<br>
          <em>Temas "o que acontece se..." são virais e geram milhões de views.</em>
        </p>
      </div>

      <!-- Roteiro 4 -->
      <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:20px;margin-bottom:16px;">
        <h3 style="color:#c4b5fd;font-size:15px;margin:0 0 8px;">📹 Roteiro 4 — "As 5 IAs Mais Impressionantes de 2026"</h3>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">
          Nicho: Tecnologia · Duração: ~3 min · Modo: Stock Images<br>
          <em>Tecnologia + IA = busca crescente. Publique no YouTube e TikTok ao mesmo tempo.</em>
        </p>
      </div>

      <!-- Roteiro 5 -->
      <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:20px;margin-bottom:16px;">
        <h3 style="color:#c4b5fd;font-size:15px;margin:0 0 8px;">📹 Roteiro 5 — "Notícias do Dia — Resumo em 1 Minuto"</h3>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">
          Nicho: Notícias · Duração: ~1 min · Modo: Notícias Automáticas<br>
          <em>Use o modo "Notícias Automáticas" — o VideoForge coleta, gera e publica sozinho.</em>
        </p>
      </div>
    </div>

    <!-- Dicas de crescimento -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:24px;margin-bottom:24px;">
      <h3 style="color:#e2e8f0;font-size:16px;margin:0 0 16px;">🚀 3 Dicas para Crescer no YouTube com IA</h3>
      <ol style="color:#94a3b8;font-size:14px;line-height:2;margin:0;padding:0 0 0 20px;">
        <li><strong style="color:#e2e8f0;">Poste todos os dias</strong> — Com o VideoForge você gera 5+ vídeos por dia. Consistência é a chave do algoritmo.</li>
        <li><strong style="color:#e2e8f0;">Use modos gratuitos</strong> — Stock Images + Gemini + Edge TTS = custo zero. Comece assim e reinvista os ganhos.</li>
        <li><strong style="color:#e2e8f0;">Publique em múltiplas plataformas</strong> — YouTube + TikTok + Shorts. O mesmo vídeo pode viralizar em qualquer uma.</li>
      </ol>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <p style="color:#cbd5e1;font-size:16px;margin:0 0 16px;">
        Pronto para colocar esses roteiros em prática?
      </p>
      <a href="${checkoutUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:16px;">
        🔥 Começar agora — R$ 59 →
      </a>
      <p style="color:#64748b;font-size:12px;margin:12px 0 0;">
        🛡️ Garantia de 7 dias · Pagamento seguro via Hotmart · Acesso vitalício
      </p>
    </div>

    <!-- Modo grátis -->
    <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
      <p style="color:#86efac;font-size:13px;margin:0;">
        ✅ Modos Stock Images + Stick Animation são <strong>100% gratuitos</strong> — gere vídeos sem gastar nada com IA!
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="color:#4b5563;font-size:12px;margin:0;">
        © 2026 VideoForge — Automação de Vídeos com IA<br>
        <a href="${appUrl}/privacy" style="color:#6b7280;text-decoration:none;">Política de Privacidade</a> ·
        <a href="${appUrl}/terms" style="color:#6b7280;text-decoration:none;">Termos de Uso</a>
      </p>
      <p style="color:#374151;font-size:11px;margin:8px 0 0;">
        Você recebeu este email porque se cadastrou em videoforge.tech
      </p>
    </div>
  </div>
</body>
</html>`;

  const textContent = `🎬 VideoForge — Seus 5 Roteiros Prontos

Obrigado por se cadastrar! Aqui estão 5 roteiros prontos para vídeos virais:

📹 1. "5 Fatos Sobre o Espaço que Ninguém Te Contou" — Curiosidades, ~2 min
📹 2. "3 Maneiras de Ganhar Dinheiro Online em 2026" — Finanças, ~3 min
📹 3. "O Que Acontece Se Você Não Dormir por 72 Horas" — Ciência, ~2 min
📹 4. "As 5 IAs Mais Impressionantes de 2026" — Tecnologia, ~3 min
📹 5. "Notícias do Dia — Resumo em 1 Minuto" — Notícias, ~1 min

Cole esses temas no VideoForge e ele gera o vídeo completo automaticamente!

🚀 3 Dicas para Crescer no YouTube com IA:
1. Poste todos os dias — com o VideoForge você gera 5+ vídeos por dia
2. Use modos gratuitos — Stock Images + Gemini + Edge TTS = custo zero
3. Publique em múltiplas plataformas — YouTube + TikTok + Shorts

Comece agora: ${checkoutUrl}

🛡️ Garantia de 7 dias · Acesso vitalício · R$ 59 pagamento único

© 2026 VideoForge
`;

  try {
    await t.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: '🎁 Seus 5 roteiros prontos para vídeos virais com IA',
      text: textContent,
      html: htmlContent,
    });
    console.log(`📧 Email de lead enviado para: ${email}`);
    return true;
  } catch (err) {
    console.error(`❌ Erro ao enviar email de lead para ${email}:`, err.message);
    return false;
  }
}
