#!/usr/bin/env python3
"""
Script para renderizar vídeo com FFmpeg
Combina imagens, áudio e adiciona efeitos
"""
import sys
import json
import subprocess
import os
from pathlib import Path

def baixar_imagem(url, destino):
    """Baixa imagem da URL"""
    try:
        import requests
        response = requests.get(url, stream=True)
        response.raise_for_status()
        with open(destino, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"❌ Erro ao baixar imagem: {e}")
        return False

def renderizar_video(video_id, audio_path, visuais_json):
    """Renderiza vídeo usando FFmpeg"""
    try:
        visuais = json.loads(visuais_json)
        
        # Criar diretório temporário para imagens
        temp_dir = f"/media/temp/{video_id}"
        os.makedirs(temp_dir, exist_ok=True)
        
        # Baixar todas as imagens
        imagens = []
        for i, visual in enumerate(visuais):
            img_path = f"{temp_dir}/cena_{i+1}.jpg"
            if baixar_imagem(visual['url'], img_path):
                imagens.append(img_path)
        
        if not imagens:
            print("❌ Nenhuma imagem foi baixada")
            return False
        
        # Criar lista de inputs para FFmpeg
        inputs = []
        filters = []
        
        for i, img in enumerate(imagens):
            # Cada imagem dura 10 segundos com efeito Ken Burns (zoom)
            inputs.extend(['-loop', '1', '-t', '10', '-i', img])
            filters.append(
                f"[{i}:v]scale=1920:1080:force_original_aspect_ratio=increase,"
                f"crop=1920:1080,"
                f"zoompan=z='min(zoom+0.001,1.2)':d=250:s=1920x1080:fps=25[v{i}]"
            )
        
        # Adicionar áudio
        inputs.extend(['-i', audio_path])
        
        # Concatenar todos os vídeos
        concat_input = ''.join([f"[v{i}]" for i in range(len(imagens))])
        filters.append(f"{concat_input}concat=n={len(imagens)}:v=1:a=0[vout]")
        
        # Comando FFmpeg completo
        output_path = f"/media/videos/{video_id}.mp4"
        
        cmd = [
            'ffmpeg', '-y',
            *inputs,
            '-filter_complex', ';'.join(filters),
            '-map', '[vout]',
            '-map', f'{len(imagens)}:a',
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
            output_path
        ]
        
        print(f"🎬 Renderizando vídeo...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ Vídeo renderizado: {output_path}")
            # Limpar arquivos temporários
            for img in imagens:
                try:
                    os.remove(img)
                except:
                    pass
            return True
        else:
            print(f"❌ Erro FFmpeg: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao renderizar: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Uso: python renderizar_video.py 'video_id' 'audio_path' 'visuais_json'")
        sys.exit(1)
    
    video_id = sys.argv[1]
    audio_path = sys.argv[2]
    visuais_json = sys.argv[3]
    
    success = renderizar_video(video_id, audio_path, visuais_json)
    sys.exit(0 if success else 1)
