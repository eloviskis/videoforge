import json, subprocess, os, requests, sys, math, textwrap, random, shutil

video_id = sys.argv[1]
audio_path = sys.argv[2]
roteiro_path = sys.argv[3]
visuais_path = sys.argv[4]
duracoes_path = sys.argv[5]
output_path = sys.argv[6]

roteiro = json.load(open(roteiro_path))
visuais = json.load(open(visuais_path))
duracoes = json.load(open(duracoes_path))

temp_dir = f'/media/temp/{video_id}'
os.makedirs(temp_dir, exist_ok=True)

# ================================================
# CORES DO TEMA NEWS (PROFISSIONAL)
# ================================================
COR_BARRA_TOPO = '#0f1923'
COR_BARRA_LOWER = '#b71c1c'
COR_ACCENT = '#e53935'
COR_ACCENT_GOLD = '#f9a825'
COR_TEXTO_BRANCO = '#ffffff'
COR_TEXTO_LIGHT = '#ecf0f1'
COR_FUNDO = '#0a0a14'

# ================================================
# HELPERS
# ================================================
def run_ffmpeg(cmd, timeout=180, label='ffmpeg'):
    """Wrapper para subprocess com melhor logging"""
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        err = result.stderr[-500:] if result.stderr else 'sem stderr'
        print(f'  [{label}] ERRO: {err}')
    return result

def download_image(url, path):
    """Download e normaliza imagem para 1920x1080 yuv420p"""
    raw_path = path + '_raw.jpg'
    try:
        r = requests.get(url, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        r.raise_for_status()
        if len(r.content) < 3000:
            return False
        with open(raw_path, 'wb') as f:
            f.write(r.content)
        # Normalizar: forçar yuv420p (CRUCIAL para xfade funcionar!)
        result = subprocess.run([
            'ffmpeg', '-y', '-i', raw_path,
            '-vf', 'format=yuv420p,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
            '-q:v', '2', path
        ], capture_output=True, timeout=30)
        try:
            os.remove(raw_path)
        except:
            pass
        return result.returncode == 0
    except Exception as e:
        print(f'  Download falhou ({url[:60]}): {e}')
        return False

def escape_text(text):
    """Escape robusto para FFmpeg drawtext"""
    if not text:
        return ''
    t = str(text)
    t = t.replace('\\', '')
    # Substituir aspas simples por smart quote (evita problemas de shell)
    t = t.replace("'", "\u2019")
    t = t.replace('"', '\\"')
    t = t.replace(':', '\\:')
    t = t.replace('%', '%%')
    t = t.replace('[', '(').replace(']', ')')
    t = t.replace(';', ',')
    t = t.replace('\n', ' ')
    return t

def gerar_fallback_image(path):
    """Gera imagem fallback sólida"""
    subprocess.run([
        'ffmpeg', '-y', '-f', 'lavfi', '-i',
        f'color=c=0x0a0a14:s=1920x1080:d=1,format=yuv420p',
        '-frames:v', '1', '-q:v', '2', path
    ], capture_output=True, timeout=10)

# ================================================
# MUSICA DE FUNDO AMBIENT
# ================================================
def gerar_musica_fundo(duracao, path):
    dur = int(duracao) + 8
    fc = (
        f"sine=frequency=65:duration={dur}:sample_rate=44100[sub];"
        f"sine=frequency=110:duration={dur}:sample_rate=44100[bass];"
        f"sine=frequency=164.81:duration={dur}:sample_rate=44100[fifth];"
        f"sine=frequency=220:duration={dur}:sample_rate=44100[oct];"
        f"sine=frequency=329.63:duration={dur}:sample_rate=44100[hi];"
        f"[sub]volume=0.06[s];[bass]volume=0.10[b];[fifth]volume=0.06[f];"
        f"[oct]volume=0.04[o];[hi]volume=0.02[h];"
        f"[s][b][f][o][h]amix=inputs=5:duration=longest[mix];"
        f"[mix]aecho=0.8:0.88:80:0.35,aecho=0.8:0.7:50:0.25[echo];"
        f"[echo]lowpass=f=500,highpass=f=40[filtered];"
        f"[filtered]volume=1.2[boosted];"
        f"[boosted]afade=t=in:st=0:d=4,afade=t=out:st={dur-4}:d=4[out]"
    )
    result = subprocess.run([
        'ffmpeg', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
        '-filter_complex', fc, '-map', '[out]', '-t', str(dur),
        '-c:a', 'libmp3lame', '-b:a', '128k', path
    ], capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        subprocess.run([
            'ffmpeg', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
            '-t', str(dur), '-c:a', 'libmp3lame', '-b:a', '128k', path
        ], capture_output=True, timeout=30)
    return os.path.exists(path)

# ================================================
# KEN BURNS - clip de uma imagem
# ================================================
def gerar_clip_imagem(img_path, duracao, clip_path, kb_style=0):
    dur = max(duracao, 1.5)
    d = int(dur * 25)
    kb_effects = [
        f"zoompan=z='min(zoom+0.0008,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={d}:s=1920x1080:fps=25",
        f"zoompan=z='1.06':x='(iw-iw/zoom)*on/{d}':y='ih/2-(ih/zoom/2)':d={d}:s=1920x1080:fps=25",
        f"zoompan=z='if(eq(on,1),1.12,max(zoom-0.0006,1.02))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={d}:s=1920x1080:fps=25",
        f"zoompan=z='1.06':x='(iw-iw/zoom)*(1-on/{d})':y='ih/2-(ih/zoom/2)':d={d}:s=1920x1080:fps=25",
        f"zoompan=z='min(zoom+0.0007,1.07)':x='0':y='0':d={d}:s=1920x1080:fps=25",
        f"zoompan=z='1.05':x='(iw-iw/zoom)*on/{d}':y='(ih-ih/zoom)*on/{d}':d={d}:s=1920x1080:fps=25",
    ]
    kb = kb_effects[kb_style % len(kb_effects)]
    vf = f'format=yuv420p,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1:1,{kb}'
    cmd = [
        'ffmpeg', '-y', '-loop', '1', '-t', str(dur), '-i', img_path,
        '-vf', vf, '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-pix_fmt', 'yuv420p', '-r', '25', '-t', str(dur), clip_path
    ]
    return run_ffmpeg(cmd, timeout=120, label='kb_clip').returncode == 0

# ================================================
# SLIDESHOW: múltiplas imagens com xfade
# ================================================
def gerar_slideshow_clip(imagens, duracao, clip_path, kb_base=0):
    n_imgs = len(imagens)
    if n_imgs == 0:
        return False
    dur = max(duracao, 3.0)
    if n_imgs == 1:
        return gerar_clip_imagem(imagens[0], dur, clip_path, kb_base)

    # Múltiplas imagens com xfade
    seg_dur = max(dur / n_imgs, 2.5)
    xfade_dur = min(0.8, seg_dur * 0.2)

    input_args = []
    for img in imagens:
        input_args.extend(['-loop', '1', '-t', str(seg_dur + 2), '-i', img])

    kb_effects = [
        "zoompan=z='min(zoom+0.0008,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={d}:s=1920x1080:fps=25",
        "zoompan=z='1.06':x='(iw-iw/zoom)*on/{d}':y='ih/2-(ih/zoom/2)':d={d}:s=1920x1080:fps=25",
        "zoompan=z='if(eq(on,1),1.10,max(zoom-0.0005,1.02))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={d}:s=1920x1080:fps=25",
        "zoompan=z='1.06':x='(iw-iw/zoom)*(1-on/{d})':y='ih/2-(ih/zoom/2)':d={d}:s=1920x1080:fps=25",
    ]
    transitions = ['fade', 'slideleft', 'slideright', 'fadeblack', 'smoothleft', 'smoothright']

    filter_parts = []
    for i in range(n_imgs):
        d = int((seg_dur + 1) * 25)
        kb = kb_effects[(kb_base + i) % len(kb_effects)].format(d=d)
        filter_parts.append(
            f"[{i}:v]format=yuv420p,scale=1920:1080:force_original_aspect_ratio=increase,"
            f"crop=1920:1080,setsar=1:1,{kb},"
            f"trim=duration={seg_dur + 0.5},setpts=PTS-STARTPTS[v{i}]"
        )

    # Chain xfade
    if n_imgs == 2:
        offset = max(seg_dur - xfade_dur, 0.5)
        tr = transitions[kb_base % len(transitions)]
        filter_parts.append(f"[v0][v1]xfade=transition={tr}:duration={xfade_dur}:offset={offset:.2f}[merged]")
    else:
        prev_label = 'v0'
        for i in range(1, n_imgs):
            offset_val = max((seg_dur - xfade_dur) * i, 0.5)
            out_label = 'merged' if i == n_imgs - 1 else f'xf{i}'
            tr = transitions[(kb_base + i) % len(transitions)]
            filter_parts.append(f"[{prev_label}][v{i}]xfade=transition={tr}:duration={xfade_dur}:offset={offset_val:.2f}[{out_label}]")
            prev_label = out_label

    filter_parts.append(f"[merged]trim=duration={dur + 0.5},setpts=PTS-STARTPTS[final]")
    filter_complex = ';'.join(filter_parts)

    cmd = [
        'ffmpeg', '-y', *input_args,
        '-filter_complex', filter_complex,
        '-map', '[final]', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21',
        '-pix_fmt', 'yuv420p', '-r', '25', '-t', str(dur + 0.5), clip_path
    ]
    result = run_ffmpeg(cmd, timeout=240, label='slideshow_xfade')
    if result.returncode != 0:
        print(f'  xfade falhou, tentando concat simples...')
        return gerar_slideshow_concat(imagens, dur, clip_path, kb_base)
    return True

def gerar_slideshow_concat(imagens, duracao, clip_path, kb_base=0):
    """Fallback: sub-clips individuais concatenados"""
    n = len(imagens)
    seg_dur = max(duracao / n, 2.0)
    sub_clips = []
    for i, img in enumerate(imagens):
        sub_path = clip_path + f'_sub{i}.mp4'
        if gerar_clip_imagem(img, seg_dur, sub_path, kb_base + i):
            sub_clips.append(sub_path)
    if not sub_clips:
        return gerar_clip_imagem(imagens[0], duracao, clip_path, kb_base)
    if len(sub_clips) == 1:
        shutil.move(sub_clips[0], clip_path)
        return True
    list_file = clip_path + '_concat.txt'
    with open(list_file, 'w') as f:
        for sc in sub_clips:
            f.write(f"file '{sc}'\n")
    result = run_ffmpeg([
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', list_file,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-pix_fmt', 'yuv420p', '-r', '25', clip_path
    ], timeout=120, label='slideshow_concat')
    for sc in sub_clips:
        try: os.remove(sc)
        except: pass
    try: os.remove(list_file)
    except: pass
    return result.returncode == 0

# ================================================
# APLICAR OVERLAYS (texto, barras) sobre um clip
# ================================================
def aplicar_overlays(clip_in, clip_out, overlay_filters):
    if not overlay_filters:
        shutil.copy2(clip_in, clip_out)
        return True
    vf = ','.join(overlay_filters)
    result = run_ffmpeg([
        'ffmpeg', '-y', '-i', clip_in, '-vf', vf,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-pix_fmt', 'yuv420p', '-r', '25', clip_out
    ], timeout=120, label='overlays')
    if result.returncode != 0:
        print(f'  Overlays falharam, usando clip limpo')
        shutil.copy2(clip_in, clip_out)
    return True

# ================================================
# RENDERIZAR SEGMENTO COMPLETO
# ================================================
def renderizar_segmento(imagens, duracao, overlay_filters, clip_path, kb_base=0):
    dur = max(duracao, 3.0) + 0.5
    fade_out = max(dur - 0.4, 1.0)
    raw_path = clip_path + '_raw.mp4'
    overlay_path = clip_path + '_ovl.mp4'

    # Passo 1: Slideshow (xfade entre imagens)
    if not gerar_slideshow_clip(imagens, dur, raw_path, kb_base):
        if not imagens:
            return False
        fb = imagens[0]
        if not gerar_clip_imagem(fb, dur, raw_path, kb_base):
            return False

    # Passo 2: Overlays (drawtext, drawbox com cores #hex)
    ok_ovl = aplicar_overlays(raw_path, overlay_path, overlay_filters)
    if not ok_ovl or not os.path.exists(overlay_path):
        overlay_path = raw_path

    # Passo 3: Fades de entrada/saída
    result = run_ffmpeg([
        'ffmpeg', '-y', '-i', overlay_path,
        '-vf', f'fade=t=in:st=0:d=0.4,fade=t=out:st={fade_out:.2f}:d=0.4',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-pix_fmt', 'yuv420p', '-r', '25', '-t', str(dur), clip_path
    ], timeout=120, label='fades')

    # Limpar intermediários
    for p in [raw_path, overlay_path]:
        if p != clip_path and os.path.exists(p):
            try: os.remove(p)
            except: pass

    if result.returncode != 0:
        for p in [overlay_path, raw_path]:
            if os.path.exists(p) and p != clip_path:
                try:
                    shutil.move(p, clip_path)
                    return True
                except:
                    pass
        return False

    return os.path.exists(clip_path)

# ================================================
# DOWNLOAD IMAGENS
# ================================================
print('=== BAIXANDO IMAGENS ===')
imagens_map = {}
for i, v in enumerate(visuais):
    urls = v.get('urls', [])
    if not urls and v.get('url'):
        urls = [v['url']]
    downloaded = []
    for j, url in enumerate(urls):
        img_path = f'{temp_dir}/news_img_{i}_{j}.jpg'
        if url and download_image(url, img_path):
            downloaded.append(img_path)
    if not downloaded:
        fb_path = f'{temp_dir}/news_img_{i}_fb.jpg'
        gerar_fallback_image(fb_path)
        downloaded.append(fb_path)
    imagens_map[i] = downloaded
    print(f'  Visual {i+1}/{len(visuais)}: {len(downloaded)} imgs ({v.get("tipo","?")})')

# ================================================
# MUSICA DE FUNDO
# ================================================
print('=== GERANDO MUSICA DE FUNDO ===')
total_duracao = sum(duracoes) + len(duracoes) * 1.0 + 8
musica_path = f'{temp_dir}/news_bgm.mp3'
gerar_musica_fundo(total_duracao, musica_path)
print(f'  Musica: {total_duracao:.0f}s gerada')

# ================================================
# RENDERIZAR CLIPS
# ================================================
print('=== RENDERIZANDO CLIPS ===')
clips = []
total_noticias = len(roteiro.get('noticias', []))
duracao_idx = 0

# --- ABERTURA ---
print('--- ABERTURA ---')
abertura_dur = duracoes[duracao_idx] if duracao_idx < len(duracoes) else 10.0
abertura_clip = f'{temp_dir}/clip_abertura.mp4'
titulo = escape_text(roteiro.get('titulo', 'Resumo do Dia'))

abertura_overlays = [
    f"eq=brightness=-0.12:saturation=0.85",
    f"drawbox=x=0:y=ih/2-140:w=iw:h=280:color={COR_BARRA_TOPO}@0.88:t=fill",
    f"drawbox=x=0:y=ih/2-140:w=iw:h=4:color={COR_ACCENT}:t=fill",
    f"drawbox=x=0:y=ih/2+136:w=iw:h=4:color={COR_ACCENT}:t=fill",
    f"drawtext=text='{titulo}':fontcolor=white:fontsize=46:"
    f"x=(w-text_w)/2:y=(h-text_h)/2-30:"
    f"font=DejaVu Sans Bold:borderw=3:bordercolor=black:"
    f"enable='gte(t,0.4)'",
    f"drawtext=text='COMPILACAO DE NOTICIAS DO DIA':fontcolor={COR_TEXTO_LIGHT}:fontsize=24:"
    f"x=(w-text_w)/2:y=(h/2)+30:"
    f"font=DejaVu Sans:borderw=2:bordercolor=black:"
    f"enable='gte(t,0.7)'",
    f"drawbox=x=iw/2-200:y=ih/2+65:w=400:h=3:color={COR_ACCENT_GOLD}:t=fill:"
    f"enable='gte(t,0.9)'",
]
if renderizar_segmento(imagens_map.get(0, []), abertura_dur, abertura_overlays, abertura_clip, kb_base=0):
    clips.append(abertura_clip)
    print(f'  Abertura: {abertura_dur:.1f}s OK ({len(imagens_map.get(0, []))} imgs)')
else:
    print(f'  Abertura: FALHOU')
duracao_idx += 1

# --- NOTICIAS ---
for i, noticia in enumerate(roteiro.get('noticias', [])):
    print(f'--- NOTICIA {i+1}/{total_noticias} ---')
    dur = duracoes[duracao_idx] if duracao_idx < len(duracoes) else 18.0
    clip_path = f'{temp_dir}/clip_news_{i+1}.mp4'
    img_idx = i + 1
    imgs = imagens_map.get(img_idx, imagens_map.get(0, []))

    manchete = escape_text(noticia.get('manchete', f'Noticia {i+1}')[:75])
    fonte = escape_text(noticia.get('fonte', 'Fonte')[:35])
    numero_text = escape_text(f'{i+1}/{total_noticias}')

    news_overlays = [
        f"drawbox=x=0:y=0:w=iw:h=55:color={COR_BARRA_TOPO}@0.85:t=fill",
        f"drawtext=text='NOTICIAS DO DIA':fontcolor={COR_TEXTO_LIGHT}:fontsize=20:"
        f"x=25:y=16:font=DejaVu Sans Bold",
        f"drawbox=x=iw-120:y=8:w=105:h=40:color={COR_ACCENT}@0.92:t=fill:"
        f"enable='gte(t,0.3)'",
        f"drawtext=text='{numero_text}':fontcolor=white:fontsize=22:"
        f"x=iw-108:y=18:font=DejaVu Sans Bold:"
        f"enable='gte(t,0.3)'",
        f"drawbox=x=0:y=ih-160:w=iw:h=90:color={COR_BARRA_LOWER}@0.93:t=fill:"
        f"enable='gte(t,0.5)'",
        f"drawbox=x=0:y=ih-70:w=iw:h=70:color={COR_BARRA_TOPO}@0.90:t=fill:"
        f"enable='gte(t,0.5)'",
        f"drawbox=x=0:y=ih-160:w=6:h=160:color={COR_ACCENT_GOLD}:t=fill:"
        f"enable='gte(t,0.5)'",
        f"drawtext=text='{manchete}':fontcolor=white:fontsize=34:"
        f"x=30:y=ih-148:font=DejaVu Sans Bold:"
        f"borderw=2:bordercolor=black:"
        f"enable='gte(t,0.6)'",
        f"drawtext=text='Fonte\\: {fonte}':fontcolor={COR_TEXTO_LIGHT}:fontsize=20:"
        f"x=30:y=ih-50:font=DejaVu Sans:"
        f"borderw=1:bordercolor=black:"
        f"enable='gte(t,0.6)'",
    ]

    if renderizar_segmento(imgs, dur, news_overlays, clip_path, kb_base=i):
        clips.append(clip_path)
        print(f'  Noticia {i+1}/{total_noticias}: {dur:.1f}s OK ({len(imgs)} imgs)')
    else:
        print(f'  Noticia {i+1}/{total_noticias}: FALHOU - tentando recuperar')
        if imgs:
            if gerar_clip_imagem(imgs[0], dur, clip_path, i):
                clips.append(clip_path)
                print(f'  Noticia {i+1}: recuperada com imagem simples')
    duracao_idx += 1

# --- ENCERRAMENTO ---
print('--- ENCERRAMENTO ---')
enc_dur = duracoes[duracao_idx] if duracao_idx < len(duracoes) else 10.0
enc_img_idx = len(visuais) - 1
enc_clip = f'{temp_dir}/clip_encerramento.mp4'
texto_obrigado = escape_text('Obrigado por assistir!')
cta_text = escape_text('INSCREVA-SE e ATIVE o sino!')

enc_overlays = [
    f"eq=brightness=-0.18:saturation=0.8",
    f"drawbox=x=0:y=ih/2-160:w=iw:h=320:color={COR_BARRA_TOPO}@0.88:t=fill",
    f"drawbox=x=0:y=ih/2-160:w=iw:h=4:color={COR_ACCENT}:t=fill",
    f"drawbox=x=0:y=ih/2+156:w=iw:h=4:color={COR_ACCENT}:t=fill",
    f"drawtext=text='{texto_obrigado}':fontcolor=white:fontsize=50:"
    f"x=(w-text_w)/2:y=(h-text_h)/2-40:"
    f"font=DejaVu Sans Bold:borderw=3:bordercolor=black:"
    f"enable='gte(t,0.3)'",
    f"drawtext=text='{cta_text}':fontcolor={COR_ACCENT_GOLD}:fontsize=30:"
    f"x=(w-text_w)/2:y=(h/2)+25:"
    f"font=DejaVu Sans Bold:borderw=2:bordercolor=black:"
    f"enable='gte(t,0.8)'",
    f"drawbox=x=iw/2-180:y=ih/2+70:w=360:h=3:color={COR_ACCENT_GOLD}:t=fill:"
    f"enable='gte(t,1.2)'",
]
if renderizar_segmento(imagens_map.get(enc_img_idx, imagens_map.get(0, [])), enc_dur, enc_overlays, enc_clip, kb_base=99):
    clips.append(enc_clip)
    print(f'  Encerramento: {enc_dur:.1f}s OK')

if not clips:
    print('ERRO FATAL: Nenhum clip renderizado')
    sys.exit(1)

print(f'=== CONCATENANDO {len(clips)} CLIPS ===')
concat_list = f'{temp_dir}/news_clips_list.txt'
with open(concat_list, 'w') as f:
    for c in clips:
        f.write(f"file '{c}'\n")

concat_video = f'{temp_dir}/news_concat.mp4'
result = run_ffmpeg([
    'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_list,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
    '-pix_fmt', 'yuv420p', '-r', '25', concat_video
], timeout=600, label='concat')

if result.returncode != 0:
    result = run_ffmpeg([
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_list,
        '-c', 'copy', concat_video
    ], timeout=300, label='concat_copy')
if result.returncode != 0:
    print('ERRO: Concat falhou')
    sys.exit(1)

# Mix audio
print('=== MIXANDO AUDIO ===')
mixed_audio = f'{temp_dir}/news_audio_mixed.mp3'
result = run_ffmpeg([
    'ffmpeg', '-y', '-i', audio_path, '-i', musica_path,
    '-filter_complex',
    '[1:a]volume=0.10[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=3[out]',
    '-map', '[out]', '-c:a', 'libmp3lame', '-b:a', '192k', mixed_audio
], timeout=120, label='mix_audio')

if result.returncode != 0:
    print('  Mix falhou, usando narracao pura')
    mixed_audio = audio_path

# Finalizar
print('=== FINALIZANDO VIDEO ===')
result = run_ffmpeg([
    'ffmpeg', '-y', '-i', concat_video, '-i', mixed_audio,
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-shortest', '-movflags', '+faststart', output_path
], timeout=300, label='final')

if result.returncode != 0:
    result = run_ffmpeg([
        'ffmpeg', '-y', '-i', concat_video, '-i', mixed_audio,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-c:a', 'aac', '-b:a', '192k', '-pix_fmt', 'yuv420p', '-r', '25',
        '-shortest', '-movflags', '+faststart', output_path
    ], timeout=600, label='final_reencode')

if result.returncode != 0:
    print('ERRO FATAL: Finalizacao falhou')
    sys.exit(1)

# Permissoes
for root_dir, dirs, files in os.walk(temp_dir):
    for fname in files:
        try: os.chmod(os.path.join(root_dir, fname), 0o666)
        except: pass
try: os.chmod(output_path, 0o666)
except: pass

size = os.path.getsize(output_path)
dur_final = float(subprocess.run(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', output_path],
    capture_output=True, text=True
).stdout.strip() or '0')
print(f'Video news pronto: {output_path} ({size // 1024 // 1024}MB, {dur_final:.0f}s, {len(clips)} clips)')
