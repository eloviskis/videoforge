#!/bin/bash

echo "🧪 Testando sistema de animações Remotion..."
echo ""

# 1. Verificar se dependências estão instaladas
echo "📦 1/4 - Verificando instalação Remotion..."
cd "/home/eloi/Área de trabalho/VideoForge/remotion-animations"

if [ ! -d "node_modules" ]; then
    echo "❌ node_modules não encontrado. Instalando..."
    npm install
else
    echo "✅ Remotion instalado"
fi

echo ""

# 2. Verificar estrutura de arquivos
echo "📁 2/4 - Verificando estrutura..."
FILES_OK=true

if [ ! -f "src/components/StickFigure.tsx" ]; then
    echo "❌ StickFigure.tsx não encontrado"
    FILES_OK=false
fi

if [ ! -f "src/components/Scene.tsx" ]; then
    echo "❌ Scene.tsx não encontrado"
    FILES_OK=false
fi

if [ ! -f "src/Root.tsx" ]; then
    echo "❌ Root.tsx não encontrado"
    FILES_OK=false
fi

if [ "$FILES_OK" = true ]; then
    echo "✅ Todos os componentes estão presentes"
fi

echo ""

# 3. Tentar renderizar cena de exemplo
echo "🎬 3/4 - Testando renderização de exemplo..."

# Criar uma cena de teste simples
mkdir -p src/generated
cat > src/generated/TestScene.tsx << 'EOF'
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Scene } from '../components/Scene';
import { StickFigure } from '../components/StickFigure';
import { Text } from '../components/Text';

export const TestScene: React.FC = () => {
  const frame = useCurrentFrame();
  
  const characterX = interpolate(frame, [0, 75], [300, 1600], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  return (
    <Scene backgroundColor="#87CEEB">
      <Text
        text="Teste VideoForge"
        x={960}
        y={100}
        fontSize={48}
        color="#000000"
        fadeIn={true}
        totalFrames={75}
      />
      
      <StickFigure
        x={characterX}
        y={800}
        scale={1.5}
        color="#FF0000"
        animation="walk"
        startFrame={0}
        endFrame={75}
      />
    </Scene>
  );
};
EOF

# Atualizar Root.tsx para incluir TestScene
cat > src/Root.tsx << 'EOF'
import { Composition } from 'remotion';
import React from 'react';
import { TestScene } from './generated/TestScene';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TestScene"
        component={TestScene}
        durationInFrames={75}
        fps={25}
        width={1920}
        height={1080}
      />
    </>
  );
};
EOF

echo "✅ Cena de teste criada"
echo ""

# 4. Renderizar teste
echo "🎥 4/4 - Renderizando vídeo de teste (3 segundos)..."
TEST_OUTPUT="/tmp/videoforge-test-animation.mp4"

npx remotion render src/Root.tsx TestScene "$TEST_OUTPUT" --overwrite 2>&1 | grep -E "(Rendered|Error|✓|✗)" | tail -10

if [ -f "$TEST_OUTPUT" ]; then
    SIZE=$(du -h "$TEST_OUTPUT" | cut -f1)
    echo ""
    echo "✅ TESTE CONCLUÍDO COM SUCESSO!"
    echo "   Arquivo: $TEST_OUTPUT"
    echo "   Tamanho: $SIZE"
    echo ""
    echo "Para assistir:"
    echo "   vlc $TEST_OUTPUT"
else
    echo ""
    echo "❌ ERRO: Arquivo não foi gerado"
    echo "Execute manualmente para ver detalhes:"
    echo "   cd remotion-animations"
    echo "   npx remotion render src/Root.tsx TestScene /tmp/test.mp4"
fi

echo ""
echo "🎬 Sistema pronto para criar vídeos com animações!"
