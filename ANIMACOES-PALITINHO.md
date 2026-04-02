# 🎨 Animações de Palitinho - VideoForge

## Visão Geral

O VideoForge oferece **dois tipos de animação de palitinho**, cada um com pipeline e estilo distintos:

| Tipo | Label no Frontend | Tecnologia | Custo | Resolução |
|------|-------------------|------------|-------|-----------|
| **🎨 Palitinho IA** (`stickAnimation`) | 🎨 Animação de Palitinho (IA) 🟢 | Gemini + Remotion (React) | Usa tokens Gemini | 1920×1080 / 25fps |
| **🖤 Dark Stickman** (`darkStickman`) | 🖤 Dark Stickman (Texto Animado) 🟢 | Python PIL + FFmpeg | 100% grátis/local | 1280×720 / 10fps |

---

## 🎨 Palitinho IA (stickAnimation)

### Pipeline

1. **Gemini gera o roteiro** — igual ao fluxo normal via `gerarRoteiro()`
2. **TTS cria a narração** — áudio por cena com FFmpeg enhancement
3. **Gemini gera código Remotion** — para cada cena, a IA gera código **TypeScript/React** com animações personalizadas
4. **Remotion renderiza** — cada cena é renderizada como MP4 via `npx remotion render`
5. **FFmpeg concatena** — junta todos os clips + áudio final

### Tecnologias

- **Remotion** — framework React para criar vídeos programaticamente
- **Gemini 2.0 Flash** — gera código TypeScript para cada cena
- **FFmpeg** — concatenação e mixagem de áudio
- **TTS** — narração em português brasileiro

### Componentes Remotion Disponíveis

Os componentes ficam em `remotion-animations/src/components/`:

#### StickFigure

Boneco palito animado com poses, expressões e símbolos:

```tsx
<StickFigure
  x={960}           // Posição horizontal
  y={800}           // Posição vertical
  scale={1.5}       // Tamanho (1.0 = normal)
  color="#FF0000"   // Cor do boneco
  animation="walk"  // walk, run, jump, wave, dance, static
  startFrame={0}    // Frame de início
  endFrame={150}    // Frame de fim
/>
```

#### Scene

Container de cena com fundo personalizado:

```tsx
<Scene backgroundColor="#87CEEB">
  {/* Seus elementos aqui */}
</Scene>
```

#### Text

Texto animado com auto-wrap e fade in/out:

```tsx
<Text
  text="Título da Cena"
  x={960}
  y={100}
  fontSize={42}
  color="#000000"
  fadeIn={true}
  fadeOut={true}
  totalFrames={150}
/>
```

#### Effect

Efeitos visuais (speedLines, speechBubble, etc.):

```tsx
<Effect type="speedLines" x={960} y={540} />
```

### Estrutura de Arquivos

```
remotion-animations/
├── package.json              # Dependências Remotion
├── remotion.config.ts        # Configuração de render
├── tsconfig.json             # TypeScript config
└── src/
    ├── Root.tsx              # Entry point (gerado automaticamente)
    ├── components/
    │   ├── StickFigure.tsx   # Boneco palito animado
    │   ├── Scene.tsx         # Container de cena
    │   ├── Text.tsx          # Texto com auto-wrap
    │   └── Effect.tsx        # Efeitos visuais
    ├── generated/            # Código gerado pela IA
    │   ├── Scene1.tsx
    │   ├── Scene2.tsx
    │   └── ...
    └── ExampleScene.tsx      # Exemplo de referência
```

### Performance

- **Cena de 10s**: ~30-60 segundos de renderização
- **Vídeo de 5 min (6 cenas)**: ~5-8 minutos total
- **Resolução**: 1920×1080 (Full HD) / 25fps / H.264

---

## 🖤 Dark Stickman (darkStickman)

### Pipeline

1. **Roteiro OFFLINE** — gerado por `gerarRoteiroDark()` em `roteiro-offline-dark.js` — **zero APIs, zero tokens**
2. **TTS cria a narração** — áudio por cena
3. **Python PIL renderiza frames** — para cada cena, detecta o `sceneType` via keywords do texto (village, mystery, ship, forest, etc.)
4. **`draw_stickman_scene.py`** gera frames individuais com PIL/Pillow e compila em vídeo via FFmpeg
5. **FFmpeg concatena** — junta todos os clips + áudio final

### Tecnologias

- **Gerador offline JS** — roteiros sem nenhuma API externa
- **Python PIL/Pillow** — renderização frame-a-frame
- **FFmpeg** — compilação de frames + concatenação + mixagem de áudio

### Elementos Visuais

O script Python desenha cenas atmosféricas com:

- **Backgrounds**: gradientes escuros, céu noturno, lua, estrelas
- **Stickman**: poses (standing, walking, scared, pointing) e expressões faciais (scared, sad, worried)
- **Cenários**: tochas com fogo animado, casas em silhueta, árvores, placas de madeira, setas, interrogações
- **Texto**: legenda na parte inferior com fundo semi-transparente

### Detecção de Tipo de Cena

O sistema analisa keywords no texto da cena para escolher o cenário:

| Keyword | Cenário |
|---------|---------|
| village, vila | Vila com casas |
| mystery, mistério | Cena misteriosa |
| ship, navio | Navio/mar |
| forest, floresta | Floresta escura |
| grupo, people | Grupo de pessoas |
| sozinho, alone | Personagem solitário |

### Performance

- **Renderização muito rápida** — PIL gera frames localmente
- **Resolução**: 1280×720 / 10fps
- **Custo**: $0 — completamente offline

---

## Como Usar no Frontend

### Palitinho IA
1. Acesse o Dashboard
2. Preencha o tema do vídeo
3. Em **"Tipo de Vídeo"**, selecione **"🎨 Animação de Palitinho (IA)"**
4. Clique em "Gerar Vídeo"

> *"A IA vai gerar código de animação personalizado para cada cena!"*

### Dark Stickman
1. Acesse o Dashboard
2. Preencha o tema do vídeo (funciona bem com temas sombrios, misteriosos, épicos)
3. Em **"Tipo de Vídeo"**, selecione **"🖤 Dark Stickman (Texto Animado)"**
4. Clique em "Gerar Vídeo"

> *"Cenas com texto animado estilo canais dark — zoom, shake, efeitos dramáticos. Zero IA, 100% local e rápido!"*

### Sugestão Automática

O sistema sugere automaticamente o tipo baseado no título/nicho:
- Palavras como "animação", "palitinho", "aventura" → sugere `stickAnimation`
- Palavras como "dark", "sombrio", "épico" → sugere `darkStickman`
- Nicho "entretenimento" → sugere `darkStickman`

---

## Exemplos de Prompts

### Para Palitinho IA (educativo/explicativo):

- ✅ "Como funciona o sistema solar"
- ✅ "História da corrida espacial"
- ✅ "10 dicas de produtividade"
- ✅ "A evolução dos computadores"

### Para Dark Stickman (drama/mistério):

- ✅ "O mistério da colônia perdida de Roanoke"
- ✅ "Lendas urbanas mais assustadoras"
- ✅ "Histórias sombrias da história"
- ✅ "Os casos mais misteriosos sem solução"

### Menos adequados para animações:

- ❌ Vlogs realistas (use stockImages ou stockVideos)
- ❌ Reviews de produtos (use modo Resenha com imagens reais)
- ❌ Tutoriais hands-on (precisa de tela real)

---

## Comparativo: Animações vs. Outros Tipos

| Aspecto | Palitinho IA | Dark Stickman | Stock Videos | IA (Gemini Veo) |
|---------|-------------|---------------|-------------|-----------------|
| **Custo** | Tokens Gemini | Grátis | Grátis (Pexels) | Tokens Google |
| **Estilo** | Whiteboard, limpo | Noturno, dramático | Realista | Realista IA |
| **Resolução** | 1080p / 25fps | 720p / 10fps | 1080p / 30fps | 720p-1080p |
| **Velocidade** | Lento (Remotion) | Rápido (PIL local) | Rápido (download) | Lento (API) |
| **Originalidade** | 100% único | 100% único | Reutilizado | 100% único |
| **Melhor para** | Educativo | Drama/Mistério | Documentários | Criativo |

---

## Troubleshooting

### Erro: "Remotion não instalado" (stickAnimation)

```bash
cd remotion-animations
npm install
```

### Erro: "FFmpeg timeout"

Aumente o timeout em `server.js`:
```js
timeout: 300000 // 5 minutos
```

### Animações estranhas (stickAnimation)

A IA pode gerar código inesperado. Se isso acontecer:
1. Tente um prompt mais específico
2. Mude a narração para ser mais descritiva
3. Reprocesse o vídeo (delete e crie novamente)

### Dark Stickman sem cenário adequado

Se o cenário não combina com o texto:
- O sistema detecta keywords. Use termos como "mistério", "floresta", "vila" no tema
- O fallback é uma cena genérica escura

---

## Casos de Uso Ideais

### Para Palitinho IA:

- 📚 Vídeos educativos
- 🎓 Explicações científicas
- 📊 Infográficos animados
- 📖 Storytelling
- 🎮 Tutoriais de conceitos
- 💡 Dicas e truques

### Para Dark Stickman:

- 🌙 Canais dark/mistério
- 👻 Histórias de terror
- 🔍 Casos não resolvidos
- ⚔️ Lendas e mitos
- 🏴‍☠️ Histórias épicas
- 🎭 Drama e suspense

---

## Inspiração

Canais de sucesso com estilos similares:

- **CGP Grey** — Stick figures + narração educativa (→ stickAnimation)
- **Kurzgesagt** — Animações complexas, começou simples (→ stickAnimation)
- **TED-Ed** — Animações educativas (→ stickAnimation)
- **Mr. Nightmare** — Narração dark com visuais simples (→ darkStickman)
- **Lazy Masquerade** — Histórias misteriosas animadas (→ darkStickman)

Com este sistema, você pode replicar esses estilos **automaticamente**!

---

**VideoForge v2.0** 🎬  
*Animações de palitinho com IA e estilo dark — tudo automático*
