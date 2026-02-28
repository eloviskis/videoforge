// ============================================
// GERADOR DE ROTEIRO OFFLINE PARA VÍDEOS DARK
// Zero APIs, zero tokens - 100% gratuito
// ============================================

const HISTORIAS_DARK = {
  roanoke: {
    titulo: "O Mistério da Colônia de Roanoke - A Cidade que Desapareceu",
    gancho: "117 pessoas. Desapareceram sem deixar rastro. Apenas uma palavra gravada em uma árvore: CROATOAN.",
    contexto: "1587. Inglaterra envia colonos para o Novo Mundo. A Ilha de Roanoke seria o início do império britânico na América. Mas o destino tinha outros planos.",
    detalhes: [
      "John White deixou a colônia para buscar suprimentos na Inglaterra. A viagem deveria durar 3 meses.",
      "Quando retornou, 3 anos depois, o lugar estava vazio. Casas intactas. Pertences deixados para trás.",
      "Não havia sinais de luta. Nenhum corpo. Nenhuma sepultura. Como se todos tivessem simplesmente... evaporado.",
      "A única pista: a palavra CROATOAN gravada em um poste. E as letras CRO em uma árvore próxima.",
      "CROATOAN era o nome de uma ilha vizinha e de uma tribo nativa. Mas ninguém foi encontrado lá.",
      "Teorias surgem até hoje: massacre, fome, doença, assimilação com nativos. Nenhuma se prova."
    ],
    teorias: [
      "Teoria 1: Foram mortos por tribos hostis. Mas onde estão os corpos? Por que não há sangue?",
      "Teoria 2: Fugiram para outra ilha devido à fome. Mas por que deixariam tudo para trás?",
      "Teoria 3: Um furacão os pegou de surpresa. O clima pode ter apagado todos os vestígios?",
      "Teoria 4: Assimilação pacífica com a tribo Croatoan. Mas por que ninguém os encontrou depois?"
    ],
    final: "Até hoje, arqueólogos procuram pistas. Centenas de anos depois, a palavra CROATOAN ainda ecoa nas mentes de quem estuda o caso. 117 almas. Desaparecidas. Para sempre. E você... o que acha que aconteceu? Deixe sua teoria nos comentários.",
    tags: ["mistério", "história", "dark", "desaparecimento", "Roanoke", "CROATOAN"],
    thumbnail: "Silhueta de palitinho solitário olhando para vila colonial abandonada em névoa densa, palavra CROATOAN gravada em madeira em primeiro plano, alto contraste, atmosfera sombria"
  }
};

function gerarRoteiroDark(tema, duracao = 10, detalhes = '') {
  // Tentar encontrar história pré-definida
  const historia = HISTORIAS_DARK[tema.toLowerCase()] || 
                   Object.values(HISTORIAS_DARK).find(h => 
                     tema.toLowerCase().includes('roanoke') || 
                     tema.toLowerCase().includes('croatoan') ||
                     tema.toLowerCase().includes('desapareceu') ||
                     tema.toLowerCase().includes('colônia')
                   );

  if (!historia) {
    // Fallback: criar estrutura genérica dark
    return gerarRoteiroDarkGenerico(tema, duracao, detalhes);
  }

  // Calcular duração de cada cena baseado em duração total
  const duracaoTotal = duracao * 60; // minutos para segundos
  const cenas = [];
  
  // CENA 1: GANCHO (10 segundos - impacto imediato)
  cenas.push({
    numero: 1,
    texto_narracao: historia.gancho,
    descricao_visual: "Texto impactante em destaque",
    prompt_visual: "Palavra CROATOAN em madeira escura, fundo preto, alto contraste, névoa, atmosfera de terror",
    acao: "Zoom lento no texto",
    duracao: 10
  });

  // CENA 2: CONTEXTO (20 segundos)
  cenas.push({
    numero: 2,
    texto_narracao: historia.contexto,
    descricao_visual: "Chegada dos colonos",
    prompt_visual: "Figuras palitinho em navio colonial chegando à ilha, silhuetas minimalistas, céu tempestuoso, preto e branco, dramático",
    acao: "Pan lateral enquanto texto aparece",
    duracao: 20
  });

  // CENAS 3-N: DETALHES (distribuir tempo restante)
  const tempoDetalhes = duracaoTotal - 10 - 20 - 30 - 30 - 20; // menos gancho, contexto, teorias, final
  const tempoPorDetalhe = Math.floor(tempoDetalhes / historia.detalhes.length);
  
  historia.detalhes.forEach((detalhe, idx) => {
    cenas.push({
      numero: 3 + idx,
      texto_narracao: detalhe,
      descricao_visual: `Detalhe ${idx + 1} do mistério`,
      prompt_visual: `Cena ${idx + 1}: stickman minimalista em vila colonial abandonada, casas vazias, pertences deixados, névoa densa, iluminação cinematográfica dark, alto contraste`,
      acao: idx % 2 === 0 ? "Zoom crescente" : "Shake sutil",
      duracao: tempoPorDetalhe
    });
  });

  // CENAS DE TEORIAS
  const offsetTeorias = 3 + historia.detalhes.length;
  historia.teorias.forEach((teoria, idx) => {
    cenas.push({
      numero: offsetTeorias + idx,
      texto_narracao: teoria,
      descricao_visual: `Teoria ${idx + 1}`,
      prompt_visual: `Teoria visual: stickman figures em situação de ${['conflito', 'fuga', 'tempestade', 'encontro'][idx]}, estilo minimalista dark, sombras fortes`,
      acao: "Fade in dramático",
      duracao: 15
    });
  });

  // CENA FINAL: REFLEXÃO PERTURBADORA
  cenas.push({
    numero: cenas.length + 1,
    texto_narracao: historia.final,
    descricao_visual: "Conclusão aberta e perturbadora",
    prompt_visual: "Palavra CROATOAN em close extremo desvanecendo em preto, efeito de névoa, final perturbador",
    acao: "Fade to black",
    duracao: 20
  });

  return {
    titulo: historia.titulo,
    descricao: `Um mergulho sombrio no mistério real da Colônia de Roanoke, conhecida como "a cidade que desapareceu". 117 colonos desapareceram sem deixar rastro em 1587, deixando apenas a palavra CROATOAN gravada. Narração investigativa e cinematográfica com estilo dark e atmosfera de suspense.`,
    tags: historia.tags,
    thumbnail_prompt: historia.thumbnail,
    cenas: cenas
  };
}

function gerarRoteiroDarkGenerico(tema, duracao, detalhes) {
  // Fallback para temas não catalogados
  return {
    titulo: `Mistério Dark: ${tema}`,
    descricao: `Um vídeo dark e misterioso sobre ${tema}`,
    tags: ["dark", "mistério", "história"],
    thumbnail_prompt: `${tema} em estilo dark minimalista com stickman figures`,
    cenas: [
      {
        numero: 1,
        texto_narracao: `Você está prestes a conhecer uma história que mudará sua percepção sobre ${tema}.`,
        descricao_visual: "Gancho impactante",
        prompt_visual: `${tema} texto impactante, fundo preto, névoa`,
        acao: "Zoom dramático",
        duracao: 10
      },
      {
        numero: 2,
        texto_narracao: `Esta é uma história real. Uma história que muitos preferem esquecer.`,
        descricao_visual: "Contexto sombrio",
        prompt_visual: `Stickman solitário em ambiente sombrio relacionado a ${tema}`,
        acao: "Pan lateral",
        duracao: 15
      },
      {
        numero: 3,
        texto_narracao: `E agora? O que você acha? Deixe sua opinião nos comentários.`,
        descricao_visual: "Call to action",
        prompt_visual: "Texto call to action em fade out para preto",
        acao: "Fade to black",
        duracao: 10
      }
    ]
  };
}

export { gerarRoteiroDark, HISTORIAS_DARK };
