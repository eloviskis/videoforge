#!/usr/bin/env node
// =====================================================
// 🧪 TESTE E2E — Usuário fictício usando o VideoForge
// =====================================================
// Simula a jornada completa de um usuário:
//  1. Registro
//  2. Login
//  3. Ver perfil (/auth/me)
//  4. Ver config do sistema
//  5. Listar vídeos
//  6. Criar vídeo (demo stick animation)
//  7. Acompanhar progresso do vídeo
//  8. Enviar feedback (muro de sugestões)
//  9. Listar feedbacks do usuário
// 10. Cleanup — deletar feedback + (opcional) user
//
// USO:
//   node test-user-journey.js                        # contra VPS
//   node test-user-journey.js http://localhost:3001   # contra local
// =====================================================

const BASE = process.argv[2] || 'https://videoforge.tech';
const API = `${BASE}/api`;

// Dados do usuário fictício
const FAKE_USER = {
  nome: 'Maria Teste',
  email: `maria.teste.${Date.now()}@videoforge.test`,
  senha: 'Teste@2026!',
};

let TOKEN = null;
let USER = null;
let VIDEO_ID = null;
let FEEDBACK_ID = null;

// ── helpers ──
const colors = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

let passed = 0;
let failed = 0;

async function api(method, path, body = null, expectStatus = 200) {
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json().catch(() => ({}));

  if (res.status !== expectStatus) {
    throw new Error(`${method} ${path} → ${res.status} (esperado ${expectStatus}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function step(label, fn) {
  const t0 = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - t0;
    console.log(`  ${colors.green('✔')} ${label} ${colors.dim(`(${ms}ms)`)}`);
    passed++;
    return result;
  } catch (err) {
    const ms = Date.now() - t0;
    console.log(`  ${colors.red('✘')} ${label} ${colors.dim(`(${ms}ms)`)}`);
    console.log(`    ${colors.red(err.message)}`);
    failed++;
    return null;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── testes ──
async function main() {
  console.log('');
  console.log(colors.bold('🧪 VideoForge — Teste de Jornada do Usuário'));
  console.log(colors.dim(`   Server: ${BASE}`));
  console.log(colors.dim(`   Usuário: ${FAKE_USER.nome} <${FAKE_USER.email}>`));
  console.log(colors.dim(`   Data: ${new Date().toLocaleString('pt-BR')}`));
  console.log('');

  // ─── FASE 1: Autenticação ───
  console.log(colors.cyan('── Fase 1: Autenticação ──'));

  await step('Health check do servidor', async () => {
    const data = await api('GET', '/health');
    if (!data.status) throw new Error('Resposta inesperada');
  });

  await step('Registrar novo usuário', async () => {
    const data = await api('POST', '/auth/register', {
      nome: FAKE_USER.nome,
      email: FAKE_USER.email,
      senha: FAKE_USER.senha,
    });
    if (!data.token) throw new Error('Token não retornado');
    if (!data.user?.id) throw new Error('User ID não retornado');
    TOKEN = data.token;
    USER = data.user;
  });

  await step('Login com credenciais', async () => {
    const data = await api('POST', '/auth/login', {
      email: FAKE_USER.email,
      senha: FAKE_USER.senha,
    });
    if (!data.token) throw new Error('Token não retornado');
    TOKEN = data.token; // usar token fresco
    USER = data.user;
  });

  await step('Verificar perfil (/auth/me)', async () => {
    const data = await api('GET', '/auth/me');
    if (data.email !== FAKE_USER.email) throw new Error(`Email errado: ${data.email}`);
    if (data.plano !== 'trial') throw new Error(`Plano errado: ${data.plano}`);
  });

  await step('Tentar registrar email duplicado (deve falhar 409)', async () => {
    await api('POST', '/auth/register', {
      nome: 'Duplicado',
      email: FAKE_USER.email,
      senha: 'Outra123!',
    }, 409);
  });

  console.log('');

  // ─── FASE 2: Explorar Sistema ───
  console.log(colors.cyan('── Fase 2: Explorar Sistema ──'));

  await step('Carregar configuração do sistema', async () => {
    const data = await api('GET', '/config');
    if (data.gemini_configured === undefined) throw new Error('Config incompleta');
  });

  await step('Listar vídeos (deve estar vazio)', async () => {
    const data = await api('GET', '/videos');
    if (!Array.isArray(data)) throw new Error('Resposta não é array');
  });

  await step('Listar tipos de vídeo', async () => {
    const data = await api('GET', '/video-types');
    if (!data.free && !data.paid) throw new Error('Resposta inesperada');
  });

  console.log('');

  // ─── FASE 3: Criar Vídeo ───
  console.log(colors.cyan('── Fase 3: Criar Vídeo (Demo) ──'));

  await step('Criar vídeo demo (stickAnimation)', async () => {
    const data = await api('POST', '/videos/demo');
    if (!data.videoId) throw new Error('videoId não retornado');
    VIDEO_ID = data.videoId;
  });

  if (VIDEO_ID) {
    await step('Verificar que vídeo foi criado', async () => {
      const data = await api('GET', `/videos/${VIDEO_ID}`);
      if (!data.id) throw new Error('Vídeo não encontrado');
      if (data.id !== VIDEO_ID) throw new Error(`ID errado: ${data.id}`);
    });

    // Acompanhar progresso por alguns segundos
    await step('Acompanhar progresso do vídeo (15s)', async () => {
      let lastStatus = '';
      let lastProgress = 0;
      for (let i = 0; i < 5; i++) {
        await sleep(3000);
        const data = await api('GET', `/videos/${VIDEO_ID}`);
        if (data.status !== lastStatus || data.progresso !== lastProgress) {
          console.log(`    ${colors.dim(`  ↳ ${data.status} — ${data.progresso}% — ${data.etapa || ''}`)}`);
          lastStatus = data.status;
          lastProgress = data.progresso;
        }
        if (data.status === 'pronto' || data.status === 'concluido' || data.status === 'publicado') {
          console.log(`    ${colors.green(`  ↳ ✅ Vídeo finalizado! URL: ${data.videoUrl || 'N/A'}`)}`);
          break;
        }
        if (data.status === 'erro') {
          console.log(`    ${colors.yellow(`  ↳ ⚠️ Erro no pipeline (esperado em teste): ${data.etapa}`)}`);
          break;
        }
      }
    });
  }

  console.log('');

  // ─── FASE 4: Feedback / Muro de Sugestões ───
  console.log(colors.cyan('── Fase 4: Feedback / Muro de Sugestões ──'));

  await step('Enviar feedback (sugestão)', async () => {
    const data = await api('POST', '/feedback', {
      tipo: 'sugestao',
      titulo: 'Adicionar modo vertical para Reels/Shorts',
      mensagem: 'Seria muito legal poder gerar vídeos em formato vertical (9:16) para postar no Instagram Reels e YouTube Shorts. Hoje só gera 16:9.',
    }, 201);
    if (!data.id) throw new Error('Feedback ID não retornado');
    FEEDBACK_ID = data.id;
  });

  await step('Enviar feedback (elogio)', async () => {
    await api('POST', '/feedback', {
      tipo: 'elogio',
      titulo: 'Plataforma incrível!',
      mensagem: 'Parabéns pelo VideoForge! Muito fácil de usar e os vídeos ficam ótimos. Já fiz 3 vídeos utilizando stick animation e todos ficaram perfeitos.',
    }, 201);
  });

  await step('Enviar feedback (bug)', async () => {
    await api('POST', '/feedback', {
      tipo: 'bug',
      titulo: 'Progresso trava em 45%',
      mensagem: 'Ao criar um vídeo com Stock Images, o progresso travou em 45% e ficou assim por 10 minutos. Precisei recarregar a página.',
    }, 201);
  });

  await step('Listar meus feedbacks (deve ter 3)', async () => {
    const data = await api('GET', '/feedback');
    if (!Array.isArray(data)) throw new Error('Resposta não é array');
    if (data.length < 3) throw new Error(`Esperava ≥3, tem ${data.length}`);
  });

  await step('Tentar enviar feedback sem título (deve falhar 400)', async () => {
    await api('POST', '/feedback', {
      tipo: 'sugestao',
      titulo: '',
      mensagem: 'Sem título',
    }, 400);
  });

  if (FEEDBACK_ID) {
    await step('Deletar feedback pendente', async () => {
      await api('DELETE', `/feedback/${FEEDBACK_ID}`);
    });

    await step('Listar feedbacks após exclusão (deve ter 2)', async () => {
      const data = await api('GET', '/feedback');
      if (data.length < 2) throw new Error(`Esperava ≥2, tem ${data.length}`);
    });
  }

  console.log('');

  // ─── FASE 5: Validações de Segurança ───
  console.log(colors.cyan('── Fase 5: Validações de Segurança ──'));

  await step('Acesso sem token deve falhar (401)', async () => {
    const savedToken = TOKEN;
    TOKEN = null;
    try {
      await api('GET', '/videos', null, 401);
    } finally {
      TOKEN = savedToken;
    }
  });

  await step('Token inválido deve falhar (401)', async () => {
    const savedToken = TOKEN;
    TOKEN = 'token-falso-invalid';
    try {
      await api('GET', '/videos', null, 401);
    } finally {
      TOKEN = savedToken;
    }
  });

  await step('Não-admin não pode acessar /admin/stats (403)', async () => {
    await api('GET', '/admin/stats', null, 403);
  });

  await step('Não-admin não pode ver todos feedbacks (403)', async () => {
    await api('GET', '/admin/feedback', null, 403);
  });

  console.log('');

  // ─── FASE 6: Criar Vídeo com Roteiro Manual ───
  console.log(colors.cyan('── Fase 6: Criar Vídeo com Roteiro Manual ──'));

  let manualVideoId = null;
  await step('Criar vídeo com roteiro manual', async () => {
    const data = await api('POST', '/videos/manual', {
      titulo: 'Teste Manual — A Aventura do Gato Programador',
      tipoVideo: 'stickAnimation',
      publicarYoutube: false,
      texto: `Era uma vez um gato chamado Pixel que vivia em um apartamento cheio de computadores.
Ele passava os dias andando sobre os teclados, escrevendo código sem querer.

Um belo dia, Pixel digitou acidentalmente o algoritmo perfeito.
Todos os bugs do sistema desapareceram como mágica.
Os desenvolvedores não acreditavam no que viam.

A partir daquele dia, Pixel se tornou o programador mais famoso do mundo.
Ele não entendia nada de programação, mas suas patas criavam código melhor que qualquer humano.
E assim, Pixel provou que às vezes a genialidade vem de onde menos se espera.`,
    });
    if (!data.videoId) throw new Error('videoId não retornado');
    manualVideoId = data.videoId;
  });

  if (manualVideoId) {
    await step('Verificar vídeo manual criado', async () => {
      const data = await api('GET', `/videos/${manualVideoId}`);
      if (data.roteiro?.cenas?.length < 2) throw new Error(`Poucas cenas: ${data.roteiro?.cenas?.length}`);
      console.log(`    ${colors.dim(`  ↳ ${data.roteiro?.cenas?.length} cenas detectadas no roteiro`)}`);
    });

    // Acompanhar brevemente
    await step('Acompanhar progresso do vídeo manual (10s)', async () => {
      for (let i = 0; i < 3; i++) {
        await sleep(3000);
        try {
          const data = await api('GET', `/videos/${manualVideoId}`);
          console.log(`    ${colors.dim(`  ↳ ${data.status} — ${data.progresso}% — ${data.etapa || ''}`)}`);
          if (data.status === 'pronto' || data.status === 'concluido' || data.status === 'erro') break;
        } catch { break; }
      }
    });
  }

  console.log('');

  // ─── RESULTADO FINAL ───
  const total = passed + failed;
  console.log(colors.bold('═══════════════════════════════════'));
  console.log(colors.bold('  📊 RESULTADO DO TESTE'));
  console.log(colors.bold('═══════════════════════════════════'));
  console.log(`  ${colors.green(`✔ Passou: ${passed}`)}`);
  console.log(`  ${colors.red(`✘ Falhou: ${failed}`)}`);
  console.log(`  Total:  ${total}`);
  console.log('');
  if (failed === 0) {
    console.log(colors.green(colors.bold('  🎉 TODOS OS TESTES PASSARAM!')));
  } else {
    console.log(colors.yellow(`  ⚠️  ${failed} teste(s) falharam. Verifique acima.`));
  }
  console.log('');
  console.log(colors.dim(`  Usuário de teste: ${FAKE_USER.email}`));
  console.log(colors.dim(`  Plano: ${USER?.plano || 'N/A'}`));
  console.log(colors.dim(`  Vídeos criados: ${[VIDEO_ID, manualVideoId].filter(Boolean).length}`));
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(colors.red(`\n💥 Erro fatal: ${err.message}`));
  process.exit(1);
});
