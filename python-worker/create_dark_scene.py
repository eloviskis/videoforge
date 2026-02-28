#!/usr/bin/env python3
"""
Cria cena de vídeo estilo Dark Stickman com texto animado
Uso: python create_dark_scene.py <text> <output_video> <duration> <effect>
"""
import sys
import subprocess
from pathlib import Path

def create_dark_scene(text: str, output_path: str, duration: float = 3.0, effect: str = "fade"):
    """
    Cria cena com texto dramático no estilo Dark Stickman
    
    Effects:
    - fade: fade in/out suave
    - zoom: texto crescendo
    - shake: tremor dramático
    - typewriter: efeito de digitação
    """
    print(f"🎬 Criando cena dark: '{text[:50]}...' ({effect})")
    
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    # Escape text for FFmpeg drawtext filter (não usado mais, mantido por compatibilidade)
    #text_escaped = text.replace('\\', '\\\\').replace("'", "\\'")
    
    # Configurações base
    fps = 30
    width = 1280
    height = 720
    font_size = 60
    
    # Salvar texto em arquivo temporário para evitar problemas de escape
    text_file = str(Path(output_path).parent / f"text_{Path(output_path).stem}.txt")
    with open(text_file, 'w', encoding='utf-8') as f:
        f.write(text)
    
    # Efeitos diferentes baseados no tipo
    if effect == "fade":
        # Fade in nos primeiros 0.5s, fade out nos últimos 0.5s
        drawtext = f"drawtext=textfile='{text_file}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize={font_size}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:alpha='if(lt(t\\,0.5)\\,t/0.5\\,if(gt(t\\,{duration-0.5})\\,({duration}-t)/0.5\\,1))'"
    
    elif effect == "zoom":
        # Texto crescendo de pequeno para grande
        drawtext = f"drawtext=textfile='{text_file}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize={font_size}*min(1.5\\,0.5+t/{duration}):fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2"
    
    elif effect == "shake":
        # Tremor no texto
        drawtext = f"drawtext=textfile='{text_file}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize={font_size}:fontcolor=white:x=(w-text_w)/2+10*sin(n/3):y=(h-text_h)/2+10*cos(n/5)"
    
    elif effect == "typewriter":
        # Efeito de digitação (mostra caracteres gradualmente)
        drawtext = f"drawtext=textfile='{text_file}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize={font_size}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:alpha='min(1\\,t/{duration}*3)'"
    
    else:
        # Default: fade simples
        drawtext = f"drawtext=textfile='{text_file}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize={font_size}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2"
    
    # Fundo preto + texto
    color_src = f"color=c=black:s={width}x{height}:d={duration}:r={fps}"
    
    cmd = [
        'ffmpeg', '-y',
        '-f', 'lavfi', '-i', color_src,
        '-vf', drawtext,
        '-t', str(duration),
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '22',
        '-pix_fmt', 'yuv420p',
        output_path
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    # Limpar arquivo temporário
    try:
        Path(text_file).unlink()
    except:
        pass
    
    if result.returncode != 0:
        print(f"❌ Erro FFmpeg: {result.stderr}")
        raise Exception(f"FFmpeg falhou: {result.stderr}")
    
    print(f"💾 Cena criada: {output_path}")
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Uso: python create_dark_scene.py <text> <output_video> <duration> <effect>")
        print("Effects: fade, zoom, shake, typewriter")
        sys.exit(1)
    
    text = sys.argv[1]
    output_path = sys.argv[2]
    duration = float(sys.argv[3])
    effect = sys.argv[4]
    
    create_dark_scene(text, output_path, duration, effect)
    print("✅ Cena concluída!")
