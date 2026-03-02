import crypto from 'crypto';
import { criarUsuario, buscarUsuarioPorEmail, atualizarUsuario, hashSenha } from './auth.js';

// ========================================
// HOTMART WEBHOOK HANDLER
// ========================================
// Docs: https://developers.hotmart.com/docs/pt-BR/webhooks/
// Eventos principais:
//   PURCHASE_APPROVED   → cria/ativa conta
//   PURCHASE_CANCELED   → desativa conta
//   PURCHASE_REFUNDED   → desativa conta
//   SUBSCRIPTION_CANCELLATION → desativa conta
//   PURCHASE_DELAYED    → aviso (boleto pendente)
// ========================================

const HOTMART_TOKEN = () => process.env.HOTMART_TOKEN || process.env.HOTMART_HOTTOK || '';

export function registrarRotasHotmart(app) {

  // ──────────────────────────────────────────
  // POST /api/hotmart/webhook
  // ──────────────────────────────────────────
  app.post('/api/hotmart/webhook', async (req, res) => {
    try {
      // Verificar hottok
      const hottok = req.body?.hottok || req.headers['x-hotmart-hottok'] || '';
      const expectedToken = HOTMART_TOKEN();
      
      if (expectedToken && hottok !== expectedToken) {
        console.warn('⚠️ Hotmart webhook: hottok inválido');
        return res.status(403).json({ error: 'Token inválido' });
      }

      const evento = req.body?.event || req.body?.data?.event || '';
      const data = req.body?.data || req.body || {};
      
      // Extrair dados do comprador
      const buyer = data.buyer || data.purchase?.buyer || {};
      const email = buyer.email || data.email || '';
      const nome = buyer.name || data.name || '';
      const transaction = data.purchase?.transaction || data.transaction || '';
      const subscription = data.subscription?.subscriber?.code || data.subscription_id || '';
      const produto = data.product?.name || data.prod_name || 'VideoForge';
      const plano = detectarPlano(data);

      console.log(`📦 Hotmart webhook: ${evento} | ${email} | plano=${plano} | tx=${transaction}`);

      switch (evento) {
        case 'PURCHASE_APPROVED':
        case 'PURCHASE_COMPLETE': {
          // Gerar senha aleatória legível
          const senha = gerarSenhaAleatoria();
          
          const user = await criarUsuario({
            email,
            senha,
            nome,
            plano,
            hotmart_transaction: transaction,
            hotmart_subscription: subscription,
          });

          console.log(`✅ Usuário criado/atualizado: ${email} (plano: ${plano})`);
          
          // Retornar senha para Hotmart exibir na página de obrigado
          // (Hotmart suporta "webhook_url" com resposta que pode ser exibida)
          return res.json({
            ok: true,
            message: `Conta criada com sucesso! Email: ${email} | Senha: ${senha}`,
            // Dados adicionais para automação
            user_email: email,
            user_senha: senha,
            plano,
          });
        }

        case 'PURCHASE_CANCELED':
        case 'PURCHASE_REFUNDED':
        case 'PURCHASE_CHARGEBACK': {
          if (email) {
            await atualizarUsuario(email, {
              ativo: false,
              hotmart_status: 'canceled',
            });
            console.log(`❌ Conta desativada: ${email} (${evento})`);
          }
          return res.json({ ok: true, action: 'deactivated' });
        }

        case 'SUBSCRIPTION_CANCELLATION': {
          if (email) {
            await atualizarUsuario(email, {
              ativo: false,
              hotmart_status: 'canceled',
            });
            console.log(`❌ Assinatura cancelada: ${email}`);
          }
          return res.json({ ok: true, action: 'subscription_canceled' });
        }

        case 'PURCHASE_DELAYED': {
          console.log(`⏳ Pagamento pendente (boleto): ${email}`);
          return res.json({ ok: true, action: 'pending' });
        }

        default: {
          console.log(`📦 Hotmart evento não tratado: ${evento}`);
          return res.json({ ok: true, action: 'ignored', evento });
        }
      }
    } catch (error) {
      console.error('❌ Erro no webhook Hotmart:', error);
      // Retornar 200 mesmo com erro (Hotmart retenta em caso de 5xx)
      return res.status(200).json({ ok: false, error: error.message });
    }
  });

  // ──────────────────────────────────────────
  // GET /api/hotmart/status — teste de conectividade
  // ──────────────────────────────────────────
  app.get('/api/hotmart/status', (req, res) => {
    res.json({
      configured: !!HOTMART_TOKEN(),
      webhook_url: `${req.protocol}://${req.get('host')}/api/hotmart/webhook`,
    });
  });
}

// ========================================
// HELPERS
// ========================================
function detectarPlano(data) {
  // Tentar detectar pelo nome do produto ou oferta
  const prodName = (data.product?.name || data.prod_name || '').toLowerCase();
  const offerName = (data.purchase?.offer?.code || '').toLowerCase();
  
  if (prodName.includes('vitalicio') || prodName.includes('lifetime') || offerName.includes('lifetime')) {
    return 'vitalicio';
  }
  if (prodName.includes('anual') || prodName.includes('yearly') || offerName.includes('anual')) {
    return 'anual';
  }
  // Padrão: mensal
  return 'mensal';
}

function gerarSenhaAleatoria() {
  // 8 chars alfanuméricos legíveis (sem caracteres ambíguos)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let senha = '';
  for (let i = 0; i < 8; i++) {
    senha += chars[crypto.randomInt(chars.length)];
  }
  return senha;
}
