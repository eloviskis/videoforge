# 🎬 VideoForge - Frontend Automático

## 🚀 Como Usar

### Iniciar tudo de uma vez:

```bash
./start.sh
```

Isso vai:
1. ✅ Verificar se os containers Docker estão rodando
2. ✅ Instalar dependências do backend e frontend
3. ✅ Iniciar a API (porta 3001)
4. ✅ Iniciar o dashboard (porta 3000)

### Acessar:

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3001/api/health

## 📝 Como Funciona

1. **Você digita** o que quer no formulário (ex: "10 curiosidades sobre o oceano")
2. **Escolhe o nicho** e duração
3. **Clica em "Criar Vídeo"**
4. **Sistema faz tudo sozinho**:
   - 🤖 Gera roteiro com IA
   - 🎙️ Cria narração com TTS
   - 🖼️ Busca/gera imagens
   - 🎬 Renderiza o vídeo
   - ✅ Pronto!

## 📊 O que aparece no dashboard:

- ✅ Status em tempo real
- ✅ Barra de progresso
- ✅ Lista de todos os vídeos
- ✅ Atualização automática a cada 3 segundos

## 🛠️ Próximos Passos para Integrar com n8n:

No arquivo `backend/server.js`, a função `gerarRoteiro()` atualmente retorna dados mock.

Para integrar com o n8n de verdade:

1. Crie o webhook no n8n: `/webhook/gerar-roteiro`
2. No backend, substitua a função por:

```javascript
async function gerarRoteiro({ nicho, topico, duracao, detalhes }) {
  const response = await axios.post('http://localhost:5678/webhook/gerar-roteiro', {
    nicho, topico, duracao, detalhes
  });
  return response.data;
}
```

3. O mesmo para as outras etapas (TTS, render, upload)

## 🎯 Exemplo de Uso

```javascript
// No dashboard, você só precisa:
- Digitar: "10 curiosidades sobre IA"
- Escolher: Tecnologia, 10 minutos
- Clicar: Criar Vídeo

// Sistema faz:
✅ Chama Gemini → gera roteiro estruturado
✅ Chama Edge TTS → gera narração
✅ Busca Pexels → baixa imagens
✅ FFmpeg → renderiza vídeo
✅ Salva em /media/videos/
```
