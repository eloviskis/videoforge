#!/usr/bin/env python3
"""
Anima imagem estática com efeitos de zoom, pan e shake usando FFmpeg
Uso: python animate_image.py <input_image> <output_video> <duration> <effect_type>
"""
import sys
import subprocess
import random
from pathlib import Path

def animate_image(input_path: str, output_path: str, duration: float = 3.0, effect_type: str = "zoom_in"):
    """
    Anima imagem com FFmpeg
    
    effect_type pode ser:
    - zoom_in: zoom gradual entrando
    - zoom_out: zoom gradual saindo
    - pan_right: pan da esquerda para direita
    - pan_left: pan da direita para esquerda
    - shake: tremor/shake dramático
    - ken_burns: combo zoom + pan aleatório
    """
    print(f"🎬 Animando imagem com efeito '{effect_type}' por {duration}s...")
    
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    # FPS
    fps = 30
    total_frames = int(duration * fps)
    
    # Filtros FFmpeg para cada tipo de efeito
    if effect_type == "zoom_in":
        # Zoom in gradual (1.0x → 1.2x)
        vf = f"zoompan=z='min(zoom+0.0015,1.2)':d={total_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720:fps={fps}"
    
    elif effect_type == "zoom_out":
        # Zoom out gradual (1.2x → 1.0x)
        vf = f"zoompan=z='if(lte(zoom,1.0),1.0,max(1.0,zoom-0.0015))':d={total_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720:fps={fps}"
    
    elif effect_type == "pan_right":
        # Pan da esquerda para direita
        vf = f"zoompan=z='1.3':d={total_frames}:x='iw/zoom*((in-1)/{total_frames})':y='ih/2-(ih/zoom/2)':s=1280x720:fps={fps}"
    
    elif effect_type == "pan_left":
        # Pan da direita para esquerda
        vf = f"zoompan=z='1.3':d={total_frames}:x='iw-iw/zoom-iw/zoom*((in-1)/{total_frames})':y='ih/2-(ih/zoom/2)':s=1280x720:fps={fps}"
    
    elif effect_type == "shake":
        # Shake dramático usando transforms
        vf = f"scale=1400:1400,crop=1280:720:x='70+25*sin(n/5)':y='70+25*cos(n/7)'"
    
    elif effect_type == "ken_burns":
        # Ken Burns effect (zoom + pan aleatório)
        zoom_end = random.uniform(1.15, 1.3)
        pan_x = random.choice(['iw/2-(iw/zoom/2)', 'iw/zoom*((in-1)/{})'.format(total_frames)])
        vf = f"zoompan=z='min(zoom+0.001,{zoom_end})':d={total_frames}:x='{pan_x}':y='ih/2-(ih/zoom/2)':s=1280x720:fps={fps}"
    
    else:
        # Default: zoom in simples
        vf = f"zoompan=z='min(zoom+0.0015,1.2)':d={total_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720:fps={fps}"
    
    # Comando FFmpeg
    cmd = [
        'ffmpeg', '-y',
        '-loop', '1',
        '-i', input_path,
        '-vf', vf,
        '-t', str(duration),
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '22',
        '-pix_fmt', 'yuv420p',
        output_path
    ]
    
    print(f"  🔧 Executando FFmpeg...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Erro FFmpeg: {result.stderr}")
        raise Exception(f"FFmpeg falhou: {result.stderr}")
    
    print(f"💾 Vídeo animado salvo: {output_path}")
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Uso: python animate_image.py <input_image> <output_video> <duration> <effect_type>")
        print("effect_type: zoom_in, zoom_out, pan_right, pan_left, shake, ken_burns")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    duration = float(sys.argv[3])
    effect_type = sys.argv[4]
    
    animate_image(input_path, output_path, duration, effect_type)
    print("✅ Animação concluída!")
