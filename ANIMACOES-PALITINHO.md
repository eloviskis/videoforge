# 🎨 Animações de Palitinho com IA - VideoForge

## Visão Geral

O VideoForge agora suporta **geração automática de animações de palitinho** usando Inteligência Artificial! Em vez de usar imagens stock do Pexels, o sistema pode criar animações programáticas personalizadas para cada cena do seu vídeo.

## Como Funciona

### Pipeline de Animação

1. **Gemini gera o roteiro** - Igual ao fluxo normal
2. **TTS cria a narração** - Áudio por cena com FFmpeg enhancement
3. **Gemini gera código Remotion** - Para cada cena, cria código TypeScript/React com animações
4. **Remotion renderiza** - Cada cena vira um vídeo MP4 com animações suaves
5. **FFmpeg concatena** - Junta todas as cenas + áudio final

### Tecnologias Utilizadas

- **Remotion** - Framework React para criar vídeos programaticamente
- **Gemini 2.0 Flash** - Gera código TypeScript para cada cena
- **FFmpeg** - Renderização e concatenação final
- **gTTS** - Narração em português brasileiro

## Componentes Disponíveis

### StickFigure

Boneco palito animado com 6 modos de animação:

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

### Scene

Container de cena com fundo personalizado:

```tsx
<Scene backgroundColor="#87CEEB">
  {/* Seus elementos aqui */}
</Scene>
```

### Text

Texto animado com fade in/out:

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

## Como Usar no Frontend

1. Acesse http://localhost:3000
2. Preencha o formulário normalmente
3. Em **"Tipo de Vídeo"**, selecione **"🎨 Animação de Palitinho (IA)"**
4. Clique em "Gerar Vídeo"

O sistema automaticamente:
- Gera código de animação personalizado para cada cena
- Renderiza com qualidade 1080p
- Adiciona narração sincronizada
- Cria transições suaves entre cenas

## Exemplos de Prompts

### Bons prompts para animações:

- ✅ "Como funciona o sistema solar" (explicativo)
- ✅ "História da corrida espacial" (narrativo)
- ✅ "10 dicas de produtividade" (educativo)
- ✅ "A evolução dos computadores" (cronológico)

### Menos adequados:

- ❌ Vlogs realistas (use stock images)
- ❌ Reviews de produtos (melhor com fotos reais)
- ❌ Tutoriais hands-on (precisa de tela real)

## Estrutura de Arquivos

```
remotion-animations/
├── package.json              # Dependências Remotion
├── remotion.config.ts        # Configuração de render
├── tsconfig.json             # TypeScript config
└── src/
    ├── Root.tsx              # Entry point (gerado automaticamente)
    ├── components/
    │   ├── StickFigure.tsx   # Componente de boneco
    │   ├── Scene.tsx         # Container de cena
    │   └── Text.tsx          # Texto animado
    ├── generated/            # Código gerado pela IA
    │   ├── Scene1.tsx
    │   ├── Scene2.tsx
    │   └── ...
    └── ExampleScene.tsx      # Exemplo de referência
```

## Performance

### Tempo de Renderização

- **Cena de 10s**: ~30-60 segundos
- **Vídeo de 5 min (6 cenas)**: ~5-8 minutos
- **Preset**: `ultrafast` para velocidade máxima

### Qualidade

- Resolução: **1920x1080** (Full HD)
- FPS: **25** (padrão brasileiro)
- Codec: **H.264** compatível com YouTube

## Vantagens vs. Stock Images

### Animações de Palitinho

✅ **Consistência**: Mesmos personagens em todas as cenas  
✅ **Controle total**: IA gera exatamente o que você precisa  
✅ **Sem royalties**: Código gerado, não há direitos autorais  
✅ **Educativo**: Perfeito para explicar conceitos  
✅ **Único**: Cada vídeo é completamente original  

### Stock Images (Pexels)

✅ **Realismo**: Fotos e vídeos reais de alta qualidade  
✅ **Rapidez**: Busca instantânea  
✅ **Variedade**: Milhões de imagens disponíveis  
✅ **Credibilidade**: Imagens profissionais  

## Casos de Uso Ideais

### Para Animações:

- 📚 Vídeos educativos
- 🎓 Explicações científicas
- 📊 Infográficos animados
- 📖 Storytelling
- 🎮 Tutoriais de conceitos
- 💡 Dicas e truques

### Para Stock Images:

- 🌍 Documentários
- 🏆 Top 10 / Listas
- 🎬 Reviews e análises
- 🏃 Vlogs e lifestyle
- 🍔 Food content
- ✈️ Viagens

## Troubleshooting

### Erro: "Remotion não instalado"

```bash
cd remotion-animations
npm install
```

### Erro: "FFmpeg timeout"

Aumente o timeout em `server.js`:
```js
timeout: 300000 // 5 minutos
```

### Animações estranhas

A IA pode gerar código inesperado. Se isso acontecer:
1. Tente um prompt mais específico
2. Mude a narração para ser mais descritiva
3. Reprocesse o vídeo (delete e crie novamente)

## Roadmap

Funcionalidades futuras:

- [ ] Mais estilos de animação (cartoon, 3D, etc.)
- [ ] Editor de código in-line no frontend
- [ ] Preview de cena antes de renderizar
- [ ] Biblioteca de templates prontos
- [ ] Personalização de cores e estilos
- [ ] Exportar código para reutilização

## Inspiração

Canais de sucesso com animações simples:

- **Kurzgesagt** - Animações complexas, mas começou simples
- **TED-Ed** - Animações educativas
- **CGP Grey** - Stick figures + narração
- **TheOdd1sOut** - Animações manuais que podem ser automatizadas

Com este sistema, você pode replicar o estilo desses canais **automaticamente**!

---

**Desenvolvido para VideoForge** 🎬  
*Transformando texto em vídeos animados com IA*
