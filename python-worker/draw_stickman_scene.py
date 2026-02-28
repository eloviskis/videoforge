#!/usr/bin/env python3
"""
Desenha cenas com animações de stickman estilo Dark + texto
Uso: python draw_stickman_scene.py <text> <scene_type> <output_video> <duration>
"""
import sys
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math
import random

def create_atmospheric_background(width, height, scene_type):
    """Cria background atmosférico com gradientes e texturas"""
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Gradiente base (céu noturno)
    for y in range(height):
        # Cores do topo (azul escuro) ao fundo (roxo/laranja)
        ratio = y / height
        if scene_type in ['village', 'mystery', 'sozinho']:
            # Azul escuro -> roxo escuro
            r = int(20 + ratio * 40)
            g = int(25 + ratio * 30)
            b = int(50 + ratio * 80)
        elif scene_type == 'ship':
            # Azul oceano
            r = int(15 + ratio * 30)
            g = int(30 + ratio * 40)
            b = int(60 + ratio * 60)
        elif scene_type == 'forest':
            # Verde escuro
            r = int(15 + ratio * 25)
            g = int(35 + ratio * 45)
            b = int(25 + ratio * 35)
        else:
            # Padrão dark
            r = int(25 + ratio * 35)
            g = int(20 + ratio * 30)
            b = int(45 + ratio * 60)
        
        draw.rectangle([0, y, width, y+1], fill=(r, g, b))
    
    # Lua
    if scene_type in ['village', 'mystery', 'forest', 'sozinho']:
        moon_x, moon_y = width - 200, 120
        draw.ellipse([moon_x-40, moon_y-40, moon_x+40, moon_y+40], fill=(220, 220, 180, 200))
        # Brilho da lua
        draw.ellipse([moon_x-50, moon_y-50, moon_x+50, moon_y+50], fill=(220, 220, 180, 30))
        draw.ellipse([moon_x-60, moon_y-60, moon_x+60, moon_y+60], fill=(220, 220, 180, 15))
    
    # Estrelas
    random.seed(42)
    for _ in range(80):
        sx = random.randint(0, width)
        sy = random.randint(0, height//2)
        size = random.randint(1, 2)
        draw.ellipse([sx, sy, sx+size, sy+size], fill=(255, 255, 200, random.randint(100, 200)))
    
    return img

def draw_stickman(draw, x, y, scale=1.0, pose="standing", expression="neutral"):
    """Desenha stickman com rosto expressivo estilo Dark"""
    s = int(30 * scale)
    
    # Cabeça (círculo preenchido)
    head_color = (245, 220, 180)  # Tom de pele claro
    draw.ellipse([x-s//3, y-s, x+s//3, y-s//3], fill=head_color, outline=(0, 0, 0), width=3)
    
    # ROSTO EXPRESSIVO
    eye_y = y - int(s*0.75)
    
    # Olhos
    if expression in ["scared", "worried"]:
        # Olhos arregalados
        draw.ellipse([x-s//6, eye_y-5, x-s//12, eye_y+5], fill=(0, 0, 0))
        draw.ellipse([x+s//12, eye_y-5, x+s//6, eye_y+5], fill=(0, 0, 0))
        draw.ellipse([x-s//6+2, eye_y-3, x-s//12-2, eye_y+1], fill=(255, 255, 255))
        draw.ellipse([x+s//12+2, eye_y-3, x+s//6-2, eye_y+1], fill=(255, 255, 255))
    else:
        # Olhos normais
        draw.ellipse([x-s//6, eye_y-3, x-s//12, eye_y+3], fill=(0, 0, 0))
        draw.ellipse([x+s//12, eye_y-3, x+s//6, eye_y+3], fill=(0, 0, 0))
    
    # Boca
    mouth_y = y - int(s*0.5)
    if expression == "scared":
        # Boca em "O" assustado
        draw.ellipse([x-s//8, mouth_y-5, x+s//8, mouth_y+5], fill=(0, 0, 0))
    elif expression == "sad":
        # Boca triste
        draw.arc([x-s//6, mouth_y-5, x+s//6, mouth_y+10], 0, 180, fill=(0, 0, 0), width=2)
    elif expression == "worried":
        # Linha horizontal
        draw.line([x-s//6, mouth_y, x+s//6, mouth_y], fill=(0, 0, 0), width=2)
    else:
        # Neutro
        draw.line([x-s//8, mouth_y, x+s//8, mouth_y], fill=(0, 0, 0), width=2)
    
    # Sobrancelhas
    if expression in ["scared", "worried"]:
        draw.line([x-s//5, eye_y-10, x-s//10, eye_y-12], fill=(0, 0, 0), width=2)
        draw.line([x+s//10, eye_y-12, x+s//5, eye_y-10], fill=(0, 0, 0), width=2)
    
    # Corpo (grosso, preto)
    body_color = (0, 0, 0)
    draw.line([x, y-s//3, x, y+s], fill=body_color, width=4)
    
    # Poses
    if pose == "standing":
        draw.line([x, y-s//4, x-s, y+s//3], fill=body_color, width=3)
        draw.line([x, y-s//4, x+s, y+s//3], fill=body_color, width=3)
        draw.line([x, y+s, x-s//2, y+int(s*1.8)], fill=body_color, width=3)
        draw.line([x, y+s, x+s//2, y+int(s*1.8)], fill=body_color, width=3)
    elif pose == "walking":
        draw.line([x, y-s//4, x-s, y], fill=body_color, width=3)
        draw.line([x, y-s//4, x+s//2, y+s//2], fill=body_color, width=3)
        draw.line([x, y+s, x-s//3, y+int(s*1.8)], fill=body_color, width=3)
        draw.line([x, y+s, x+s, y+int(s*1.5)], fill=body_color, width=3)
    elif pose == "scared":
        draw.line([x, y-s//4, x-s, y-s], fill=body_color, width=3)
        draw.line([x, y-s//4, x+s, y-s], fill=body_color, width=3)
        draw.line([x, y+s, x-s//3, y+int(s*1.7)], fill=body_color, width=3)
        draw.line([x, y+s, x+s//3, y+int(s*1.7)], fill=body_color, width=3)
    elif pose == "pointing":
        draw.line([x, y-s//4, x+int(s*1.5), y-s//2], fill=body_color, width=3)
        draw.line([x, y-s//4, x-s//2, y+s//4], fill=body_color, width=3)
        draw.line([x, y+s, x-s//2, y+int(s*1.8)], fill=body_color, width=3)
        draw.line([x, y+s, x+s//2, y+int(s*1.8)], fill=body_color, width=3)

def draw_torch(draw, x, y, scale=1.0, flicker_offset=0):
    """Desenha tocha com fogo animado"""
    # Cabo
    draw.line([x, y, x, y-int(80*scale)], fill=(139, 90, 43), width=int(8*scale))
    
    # Fogo (camadas para efeito)
    fire_y = y - int(80*scale)
    flicker = flicker_offset * 3
    
    # Camada externa (laranja escuro)
    draw.ellipse([x-int(20*scale), fire_y-int(35*scale)+flicker, 
                  x+int(20*scale), fire_y-int(5*scale)+flicker], 
                 fill=(255, 100, 0, 180))
    
    # Camada média (laranja)
    draw.ellipse([x-int(15*scale), fire_y-int(30*scale)+flicker, 
                  x+int(15*scale), fire_y-int(10*scale)+flicker], 
                 fill=(255, 150, 0, 200))
    
    # Núcleo (amarelo)
    draw.ellipse([x-int(10*scale), fire_y-int(25*scale)+flicker, 
                  x+int(10*scale), fire_y-int(15*scale)+flicker], 
                 fill=(255, 220, 0, 220))
    
    # Brilho ao redor
    draw.ellipse([x-int(30*scale), fire_y-int(40*scale), 
                  x+int(30*scale), fire_y], 
                 fill=(255, 150, 0, 20))

def draw_wooden_sign(draw, x, y, text, scale=1.0):
    """Desenha placa de madeira com texto"""
    w, h = int(200*scale), int(80*scale)
    
    # Placa de madeira
    draw.rectangle([x-w//2, y-h//2, x+w//2, y+h//2], 
                   fill=(101, 67, 33), outline=(70, 50, 30), width=3)
    
    # Textura de madeira (linhas)
    for i in range(3):
        y_line = y - h//2 + (i+1) * h//4
        draw.line([x-w//2+10, y_line, x+w//2-10, y_line], 
                  fill=(80, 55, 25), width=1)
    
    # Texto
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(35*scale))
    except:
        font = ImageFont.load_default()
    
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    draw.text((x - text_w//2, y - text_h//2), text, fill=(50, 30, 10), font=font)

def draw_arrow(draw, x1, y1, x2, y2, color=(255, 50, 50)):
    """Desenha seta decorativa"""
    # Linha principal
    draw.line([x1, y1, x2, y2], fill=color, width=6)
    
    # Ponta da seta
    angle = math.atan2(y2-y1, x2-x1)
    arrow_len = 25
    angle1 = angle + math.pi*0.8
    angle2 = angle - math.pi*0.8
    
    draw.line([x2, y2, x2 + arrow_len*math.cos(angle1), y2 + arrow_len*math.sin(angle1)], 
              fill=color, width=6)
    draw.line([x2, y2, x2 + arrow_len*math.cos(angle2), y2 + arrow_len*math.sin(angle2)], 
              fill=color, width=6)

def draw_house_silhouette(draw, x, y, scale=1.0):
    """Desenha silhueta de casa colonial no fundo"""
    w = int(120 * scale)
    h = int(90 * scale)
    
    # Casa como silhueta escura
    points = [
        (x, y),  # Base esquerda
        (x, y-h),  # Topo esquerda
        (x+w//2, y-h-40),  # Pico do telhado
        (x+w, y-h),  # Topo direita
        (x+w, y),  # Base direita
    ]
    draw.polygon(points, fill=(20, 15, 30, 150))
    
    # Janelas iluminadas
    for i in range(2):
        window_x = x + 20 + i * 60
        window_y = y - h + 30
        draw.rectangle([window_x, window_y, window_x+25, window_y+25], 
                       fill=(255, 200, 100, 200))

def draw_tree_silhouette(draw, x, y, scale=1.0):
    """Desenha árvore como silhueta escura"""
    h = int(120 * scale)
    # Copa triangular
    points = [
        (x, y-h),
        (x-int(40*scale), y-int(h*0.4)),
        (x+int(40*scale), y-int(h*0.4)),
    ]
    draw.polygon(points, fill=(15, 20, 25, 180))
    
    # Tronco
    trunk_w = int(15*scale)
    draw.rectangle([x-trunk_w//2, y-int(h*0.4), x+trunk_w//2, y], 
                   fill=(15, 20, 25, 180))

def draw_question_mark(draw, x, y, scale=1.0):
    """Desenha símbolo de interrogação decorativo"""
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(60*scale))
    except:
        font = ImageFont.load_default()
    
    draw.text((x, y), "?", fill=(255, 50, 50), font=font, anchor="mm")

def create_stickman_scene(text, scene_type, output_path, duration=3.0):
    """
    Cria cena dark com stickman figures animados estilo Dark
    scene_type: 'village', 'ship', 'forest', 'mystery', 'grupo', 'sozinho'
    """
    duration = min(duration, 8.0)
    
    print(f"🎨 Desenhando cena stickman DARK: {scene_type} - '{text[:50]}...' ({duration}s)")
    
    width, height = 1280, 720
    fps = 10
    total_frames = int(duration * fps)
    
    frames_dir = Path(output_path).parent / f"frames_{Path(output_path).stem}"
    frames_dir.mkdir(exist_ok=True)
    
    try:
        # Fonts
        try:
            font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 50)
            font_text = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
        except:
            font_title = ImageFont.load_default()
            font_text = ImageFont.load_default()
        
        # Gerar frames
        for frame_num in range(total_frames):
            # Background atmosférico
            img = create_atmospheric_background(width, height, scene_type)
            draw = ImageDraw.Draw(img, 'RGBA')
            
            t = frame_num / fps
            progress = frame_num / total_frames
            flicker = int(math.sin(t * 5) * 3)
            
            # CENAS COM ESTÉTICA DA IMAGEM DE REFERÊNCIA
            
            if scene_type == 'village':
                # Silhuetas de casas no fundo
                for i in range(3):
                    house_x = 200 + i * 350
                    house_y = 480
                    draw_house_silhouette(draw, house_x, house_y, scale=0.9)
                
                # Árvores nos cantos
                draw_tree_silhouette(draw, 100, 500, scale=1.1)
                draw_tree_silhouette(draw, width-100, 500, scale=1.0)
                
                # Stickman com tocha (como na imagem)
                stick1_x = 250
                draw_torch(draw, stick1_x-30, 520, scale=0.8, flicker_offset=flicker)
                draw_stickman(draw, stick1_x, 500, scale=1.3, pose="standing", expression="worried")
                
                # Stickman assustado do outro lado
                stick2_x = width - 300
                draw_stickman(draw, stick2_x, 500, scale=1.3, pose="scared", expression="scared")
                
            elif scene_type == 'mystery':
                # Placa com CROATOAN (elemento central da imagem)
                sign_x = width - 400
                sign_y = 480
                draw_wooden_sign(draw, sign_x, sign_y, "CROATOAN", scale=1.2)
                
                # Seta apontando para placa (como na imagem)
                arrow_start_x = sign_x - 200
                arrow_start_y = sign_y
                draw_arrow(draw, arrow_start_x, arrow_start_y, sign_x-120, sign_y, color=(255, 60, 60))
                
                # Stickman apontando
                stick_x = 280
                draw_torch(draw, stick_x-40, 520, scale=0.8, flicker_offset=flicker)
                draw_stickman(draw, stick_x, 500, scale=1.3, pose="pointing", expression="worried")
                
                # Stickman confuso do outro lado
                draw_stickman(draw, width-250, 500, scale=1.3, pose="standing", expression="scared")
                
                # Question marks flutuando (como na imagem)
                for i in range(3):
                    qm_x = width - 200 + i * 60
                    qm_y = 200 + int(math.sin(t + i) * 15)
                    draw_question_mark(draw, qm_x, qm_y, scale=0.7+i*0.15)
                
                # Casas abandonadas no fundo
                draw_house_silhouette(draw, 500, 480, scale=0.7)
                draw_house_silhouette(draw, 700, 480, scale=0.8)
                
            elif scene_type == 'ship':
                # Navio simples (retângulo + vela)
                ship_x = 400 + int(progress * 200)
                ship_y = 450
                # Casco
                draw.polygon([
                    (ship_x-100, ship_y),
                    (ship_x-80, ship_y+80),
                    (ship_x+80, ship_y+80),
                    (ship_x+100, ship_y)
                ], fill=(80, 60, 40), outline=(60, 40, 20), width=3)
                
                # Mastro
                draw.line([ship_x, ship_y, ship_x, ship_y-120], fill=(100, 70, 40), width=6)
                
                # Vela
                draw.polygon([
                    (ship_x, ship_y-120),
                    (ship_x, ship_y-20),
                    (ship_x+70, ship_y-70)
                ], fill=(200, 180, 160), outline=(150, 130, 110), width=2)
                
                # Stickmen no navio
                draw_stickman(draw, ship_x-40, ship_y+30, scale=0.9, pose="standing", expression="neutral")
                draw_stickman(draw, ship_x+30, ship_y+30, scale=0.9, pose="standing", expression="neutral")
                
            elif scene_type == 'forest':
                # Árvores densas
                for i in range(6):
                    tree_x = 100 + i * 200
                    tree_y = 450 + int(20 * math.sin(t + i))
                    draw_tree_silhouette(draw, tree_x, tree_y, scale=1.0 + i*0.1)
                
                # Stickman assustado no meio da floresta
                stick_x = width // 2
                draw_stickman(draw, stick_x, 500, scale=1.4, pose="scared", expression="scared")
                
                # Névoa/fog no chão
                for i in range(5):
                    fog_y = 600 + i * 20
                    draw.ellipse([100, fog_y, 1180, fog_y+40], fill=(150, 150, 180, 20))
                
            elif scene_type == 'grupo':
                # Grupo de colonos (como na imagem - múltiplos stickmen)
                positions = [
                    (200, 500, "standing", "worried"),
                    (350, 480, "standing", "scared"),
                    (500, 500, "scared", "scared"),
                    (650, 490, "pointing", "worried"),
                    (800, 500, "standing", "sad"),
                    (950, 480, "scared", "scared"),
                ]
                
                for x, y, pose, expr in positions:
                    draw_stickman(draw, x, y, scale=1.1, pose=pose, expression=expr)
                
                # Tocha no centro
                draw_torch(draw, width//2, 520, scale=1.0, flicker_offset=flicker)
                
                # Casas ao fundo
                draw_house_silhouette(draw, 300, 450, scale=0.7)
                draw_house_silhouette(draw, 800, 450, scale=0.7)
                
            elif scene_type == 'sozinho':
                # Stickman solitário grande e centralizado
                stick_x = width // 2
                stick_y = 450
                
                # Névoa densa ao redor
                for i in range(8):
                    fog_y = 350 + i * 40
                    alpha = int(30 + math.sin(t + i * 0.5) * 10)
                    draw.ellipse([50, fog_y, width-50, fog_y+60], fill=(120, 120, 150, alpha))
                
                # Stickman grande e assustado
                draw_stickman(draw, stick_x, stick_y, scale=1.8, pose="scared", expression="scared")
                
                # Casa abandonada de fundo
                draw_house_silhouette(draw, 800, 480, scale=1.0)
            
            else:
                # Fallback: cena genérica
                draw_stickman(draw, width//2, 500, scale=1.3, pose="standing", expression="neutral")
            
            # TEXTO NA PARTE INFERIOR (sempre visível)
            # Wrap text em múltiplas linhas
            words = text.split()
            lines = []
            current_line = ""
            
            for word in words:
                test_line = current_line + " " + word if current_line else word
                bbox = draw.textbbox((0, 0), test_line, font=font_text)
                if bbox[2] - bbox[0] < width - 100:
                    current_line = test_line
                else:
                    if current_line:
                        lines.append(current_line)
                    current_line = word
            
            if current_line:
                lines.append(current_line)
            
            # Limitar a 3 linhas
            lines = lines[:3]
            
            # Desenhar texto com fade-in e fundo semi-transparente
            text_alpha = int(min(255, progress * 512))
            text_y_start = height - 150
            
            # Fundo escuro para legibilidade
            draw.rectangle([0, text_y_start - 20, width, height], 
                          fill=(0, 0, 0, 180))
            
            for i, line in enumerate(lines):
                bbox = draw.textbbox((0, 0), line, font=font_text)
                text_w = bbox[2] - bbox[0]
                text_x = (width - text_w) // 2
                text_y = text_y_start + i * 40
                
                # Sombra do texto
                draw.text((text_x + 2, text_y + 2), line, fill=(0, 0, 0, text_alpha), font=font_text)
                # Texto principal
                draw.text((text_x, text_y), line, fill=(255, 255, 255, text_alpha), font=font_text)
            
            # Salvar frame
            frame_path = frames_dir / f"frame_{frame_num:05d}.png"
            img.save(frame_path)
        
        print(f"  ✅ {total_frames} frames gerados")
        
        # Combinar frames em vídeo com FFmpeg
        print(f"  🎬 Combinando frames em vídeo...")
        cmd = [
            'ffmpeg', '-y',
            '-framerate', str(fps),
            '-i', str(frames_dir / 'frame_%05d.png'),
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-preset', 'fast',
            '-crf', '23',
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode != 0:
            print(f"  ⚠️ FFmpeg warning: {result.stderr[:200]}")
        
        # Limpar frames temporários
        for frame in frames_dir.glob('*.png'):
            frame.unlink()
        frames_dir.rmdir()
        
        print(f"  ✅ Vídeo criado: {output_path}")
        return True
        
    except Exception as e:
        print(f"  ❌ Erro ao criar cena: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Uso: python draw_stickman_scene.py <text> <scene_type> <output_video> <duration>")
        sys.exit(1)
    
    text = sys.argv[1]
    scene_type = sys.argv[2]
    output_path = sys.argv[3]
    duration = float(sys.argv[4])
    
    success = create_stickman_scene(text, scene_type, output_path, duration)
    sys.exit(0 if success else 1)

