#!/usr/bin/env python3
"""
Script para gerar narração usando gTTS (Google Text-to-Speech)
Fallback: Edge TTS
"""
import sys
import os

def gerar_audio_gtts(texto, arquivo_saida):
    """Gera áudio usando gTTS"""
    try:
        from gtts import gTTS
        tts = gTTS(text=texto, lang='pt', slow=False)
        os.makedirs(os.path.dirname(arquivo_saida), exist_ok=True)
        tts.save(arquivo_saida)
        print(f"✅ Áudio gerado com gTTS: {arquivo_saida}")
        return True
    except Exception as e:
        print(f"❌ Erro gTTS: {e}")
        return False

def gerar_audio_edge(texto, arquivo_saida):
    """Gera áudio usando Edge TTS (fallback)"""
    try:
        import asyncio
        import edge_tts
        async def _gen():
            communicate = edge_tts.Communicate(texto, "pt-BR-FranciscaNeural")
            await communicate.save(arquivo_saida)
        asyncio.run(_gen())
        print(f"✅ Áudio gerado com Edge TTS: {arquivo_saida}")
        return True
    except Exception as e:
        print(f"❌ Erro Edge TTS: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python gerar_tts.py 'texto' 'caminho_saida.mp3'")
        sys.exit(1)
    
    texto = sys.argv[1]
    saida = sys.argv[2]
    
    # Tentar gTTS primeiro, depois Edge TTS
    if not gerar_audio_gtts(texto, saida):
        if not gerar_audio_edge(texto, saida):
            print("❌ Falha em todos os métodos de TTS")
            sys.exit(1)
    
    sys.exit(0)
