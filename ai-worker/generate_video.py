#!/usr/bin/env python3
"""
VideoForge - Gerador de Vídeo Local com IA Open Source
Suporta múltiplos modelos rodando em CPU ou GPU.

Modelos disponíveis:
  - modelscope  : ali-vilab/text-to-video-ms-1.7b (~3.3GB, mais rápido)
  - zeroscope   : cerspense/zeroscope_v2_576w (~3.7GB, melhor qualidade)
  - cogvideox   : THUDM/CogVideoX-2b (~5GB, mais novo, melhor qualidade)

Uso:
  python generate_video.py --prompt "Um gato andando" --output /media/clip.mp4 
                           --model modelscope --num_frames 16

Nota: Em CPU, a geração é LENTA (10-60min por clip dependendo do modelo).
"""

import argparse
import os
import sys
import time
import gc
import json

import torch
import numpy as np


# ============================================
# Configuração de modelos
# ============================================
def make_progress_callback(total_steps, model_name):
    """Cria callback de progresso para pipelines diffusers.
    Emite marcadores __PROGRESS__ no stdout para o backend parsear em tempo real.
    
    Retorna DOIS callbacks:
    - new_cb: para diffusers >= 0.25 (callback_on_step_end)
    - old_cb: para diffusers depreciados (callback + callback_steps)
    """
    start_time = time.time()
    
    def _emit_progress(step):
        elapsed = time.time() - start_time
        pct = int((step / total_steps) * 100)
        eta_total = (elapsed / max(step, 1)) * total_steps
        eta_remaining = max(0, eta_total - elapsed)
        
        eta_min = int(eta_remaining // 60)
        eta_sec = int(eta_remaining % 60)
        
        progress_data = {
            "step": step,
            "total_steps": total_steps,
            "percent": pct,
            "elapsed_s": round(elapsed, 1),
            "eta_s": round(eta_remaining, 1),
            "eta_fmt": f"{eta_min}m{eta_sec:02d}s",
            "model": model_name
        }
        print(f"__PROGRESS__{json.dumps(progress_data)}__END_PROGRESS__", flush=True)
    
    # Nova API (diffusers >= 0.25): callback_on_step_end(pipe, step, timestep, callback_kwargs)
    def new_cb(pipe, step, timestep, callback_kwargs):
        _emit_progress(step)
        return callback_kwargs
    
    # API antiga (TextToVideoSDPipeline depreciado): callback(step, timestep, latents)
    def old_cb(step, timestep, latents):
        _emit_progress(step)
    
    return new_cb, old_cb


MODELS = {
    "modelscope": {
        "repo": "ali-vilab/text-to-video-ms-1.7b",
        "pipeline_class": "TextToVideoSDPipeline",
        "default_frames": 16,
        "max_frames": 24,
        "default_height": 256,
        "default_width": 256,
        "description": "ModelScope T2V 1.7B - Menor e mais rápido"
    },
    "zeroscope": {
        "repo": "cerspense/zeroscope_v2_576w",
        "pipeline_class": "TextToVideoSDPipeline",
        "default_frames": 24,
        "max_frames": 36,
        "default_height": 320,
        "default_width": 576,
        "description": "ZeroScope v2 - Qualidade média-alta"
    },
    "cogvideox": {
        "repo": "THUDM/CogVideoX-2b",
        "pipeline_class": "CogVideoXPipeline",
        "default_frames": 49,
        "max_frames": 49,
        "default_height": 480,
        "default_width": 720,
        "description": "CogVideoX 2B - Melhor qualidade (mais lento)"
    }
}


def generate_with_modelscope(prompt, output_path, num_frames=16, height=256, width=256, 
                              num_inference_steps=25, guidance_scale=9.0):
    """Gera vídeo com ModelScope T2V (ali-vilab/text-to-video-ms-1.7b)"""
    from diffusers import DiffusionPipeline
    
    print(f"📥 Carregando modelo ModelScope T2V...", flush=True)
    print(f"__PROGRESS__{{\"step\":0,\"total_steps\":{num_inference_steps},\"percent\":0,\"elapsed_s\":0,\"eta_s\":0,\"eta_fmt\":\"calculando...\",\"model\":\"modelscope\",\"phase\":\"download\"}}__END_PROGRESS__", flush=True)
    pipe = DiffusionPipeline.from_pretrained(
        "ali-vilab/text-to-video-ms-1.7b",
        torch_dtype=torch.float32,  # CPU usa float32
    )
    pipe.to("cpu")
    
    # Otimizações para CPU
    pipe.enable_attention_slicing(1)
    if hasattr(pipe, 'enable_vae_slicing'):
        pipe.enable_vae_slicing()
    
    print(f"🎬 Gerando {num_frames} frames ({width}x{height})...", flush=True)
    print(f"   Prompt: {prompt[:100]}...", flush=True)
    print(f"   ⚠️  Isso pode levar 10-30 minutos em CPU...", flush=True)
    
    new_cb, old_cb = make_progress_callback(num_inference_steps, "modelscope")
    start_time = time.time()
    
    with torch.no_grad():
        # TextToVideoSDPipeline depreciado no diffusers 0.33+: usa API antiga de callback
        try:
            result = pipe(
                prompt=prompt,
                num_frames=num_frames,
                height=height,
                width=width,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                callback=old_cb,
                callback_steps=1,
            )
        except TypeError:
            # Fallback para nova API caso o pipeline suporte
            result = pipe(
                prompt=prompt,
                num_frames=num_frames,
                height=height,
                width=width,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                callback_on_step_end=new_cb,
            )
    
    elapsed = time.time() - start_time
    print(f"⏱️  Geração levou {elapsed:.1f}s ({elapsed/60:.1f}min)", flush=True)
    
    # Exportar frames para vídeo
    # result.frames pode ser ndarray (batch, T, H, W, C) ou list de PIL Images
    raw_frames = result.frames
    if isinstance(raw_frames, np.ndarray):
        # Remover batch dimension se existir: (1, T, H, W, C) -> (T, H, W, C)
        while raw_frames.ndim > 4:
            raw_frames = raw_frames[0]
    elif isinstance(raw_frames, list) and len(raw_frames) > 0:
        raw_frames = raw_frames[0]  # Pegar primeiro batch
    
    export_frames_to_video(raw_frames, output_path)
    
    # Liberar memória
    del pipe, result
    gc.collect()
    torch.cuda.empty_cache() if torch.cuda.is_available() else None
    
    return output_path


def generate_with_zeroscope(prompt, output_path, num_frames=24, height=320, width=576,
                             num_inference_steps=25, guidance_scale=9.0):
    """Gera vídeo com ZeroScope v2 (cerspense/zeroscope_v2_576w)"""
    from diffusers import DiffusionPipeline
    
    print(f"📥 Carregando modelo ZeroScope v2...", flush=True)
    pipe = DiffusionPipeline.from_pretrained(
        "cerspense/zeroscope_v2_576w",
        torch_dtype=torch.float32,
    )
    pipe.to("cpu")
    
    pipe.enable_attention_slicing(1)
    if hasattr(pipe, 'enable_vae_slicing'):
        pipe.enable_vae_slicing()
    
    print(f"🎬 Gerando {num_frames} frames ({width}x{height})...", flush=True)
    print(f"   Prompt: {prompt[:100]}...", flush=True)
    print(f"   ⚠️  Isso pode levar 15-45 minutos em CPU...", flush=True)
    
    new_cb, old_cb = make_progress_callback(num_inference_steps, "zeroscope")
    start_time = time.time()
    
    with torch.no_grad():
        try:
            result = pipe(
                prompt=prompt,
                num_frames=num_frames,
                height=height,
                width=width,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                callback=old_cb,
                callback_steps=1,
            )
        except TypeError:
            result = pipe(
                prompt=prompt,
                num_frames=num_frames,
                height=height,
                width=width,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                callback_on_step_end=new_cb,
            )
    
    elapsed = time.time() - start_time
    print(f"⏱️  Geração levou {elapsed:.1f}s ({elapsed/60:.1f}min)", flush=True)
    
    # Exportar frames
    raw_frames = result.frames
    if isinstance(raw_frames, np.ndarray):
        while raw_frames.ndim > 4:
            raw_frames = raw_frames[0]
    elif isinstance(raw_frames, list) and len(raw_frames) > 0:
        raw_frames = raw_frames[0]
    
    export_frames_to_video(raw_frames, output_path)
    
    del pipe, result
    gc.collect()
    
    return output_path


def generate_with_cogvideox(prompt, output_path, num_frames=49, height=480, width=720,
                             num_inference_steps=20, guidance_scale=6.0):
    """Gera vídeo com CogVideoX-2b (THUDM/CogVideoX-2b)"""
    from diffusers import CogVideoXPipeline
    
    print(f"📥 Carregando modelo CogVideoX-2b...", flush=True)
    print(f"__PROGRESS__{{\"step\":0,\"total_steps\":{num_inference_steps},\"percent\":0,\"elapsed_s\":0,\"eta_s\":0,\"eta_fmt\":\"calculando...\",\"model\":\"cogvideox\",\"phase\":\"download\"}}__END_PROGRESS__", flush=True)
    pipe = CogVideoXPipeline.from_pretrained(
        "THUDM/CogVideoX-2b",
        torch_dtype=torch.float32,
    )
    pipe.to("cpu")
    
    pipe.enable_attention_slicing(1)
    if hasattr(pipe, 'enable_vae_slicing'):
        pipe.enable_vae_slicing()
    if hasattr(pipe, 'enable_model_cpu_offload'):
        try:
            pipe.enable_model_cpu_offload()
        except Exception:
            pass  # Pode falhar sem GPU
    
    print(f"🎬 Gerando {num_frames} frames ({width}x{height})...", flush=True)
    print(f"   Prompt: {prompt[:100]}...", flush=True)
    print(f"   ⚠️  Isso pode levar 30-90 minutos em CPU...", flush=True)
    
    new_cb, old_cb = make_progress_callback(num_inference_steps, "cogvideox")
    start_time = time.time()
    
    with torch.no_grad():
        try:
            result = pipe(
                prompt=prompt,
                num_frames=num_frames,
                height=height,
                width=width,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                callback_on_step_end=new_cb,
            )
        except TypeError:
            result = pipe(
                prompt=prompt,
                num_frames=num_frames,
                height=height,
                width=width,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                callback=old_cb,
                callback_steps=1,
            )
    
    elapsed = time.time() - start_time
    print(f"⏱️  Geração levou {elapsed:.1f}s ({elapsed/60:.1f}min)")
    
    # Exportar frames
    raw_frames = result.frames
    if isinstance(raw_frames, np.ndarray):
        while raw_frames.ndim > 4:
            raw_frames = raw_frames[0]
    elif isinstance(raw_frames, list) and len(raw_frames) > 0:
        raw_frames = raw_frames[0]
    
    export_frames_to_video(raw_frames, output_path)
    
    del pipe, result
    gc.collect()
    
    return output_path


def export_frames_to_video(frames, output_path, fps=8):
    """Converte frames (tensors/PIL/numpy) para arquivo MP4"""
    import imageio
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Converter para numpy arrays se necessário
    video_frames = []
    
    if isinstance(frames, torch.Tensor):
        # Tensor: (T, C, H, W) ou (T, H, W, C)
        if frames.dim() == 4:
            if frames.shape[1] <= 4:  # (T, C, H, W) -> (T, H, W, C)
                frames = frames.permute(0, 2, 3, 1)
            frames_np = frames.cpu().numpy()
            if frames_np.max() <= 1.0:
                frames_np = (frames_np * 255).astype(np.uint8)
            else:
                frames_np = frames_np.astype(np.uint8)
            video_frames = [frames_np[i] for i in range(frames_np.shape[0])]
        else:
            raise ValueError(f"Formato de tensor não suportado: {frames.shape}")
    elif isinstance(frames, list):
        for frame in frames:
            if hasattr(frame, 'numpy'):
                # Tensor individual
                f = frame.cpu().numpy()
                if f.max() <= 1.0:
                    f = (f * 255).astype(np.uint8)
                if f.shape[0] <= 4:  # (C, H, W) -> (H, W, C)
                    f = np.transpose(f, (1, 2, 0))
                video_frames.append(f.astype(np.uint8))
            elif hasattr(frame, 'convert'):
                # PIL Image
                video_frames.append(np.array(frame))
            elif isinstance(frame, np.ndarray):
                if frame.max() <= 1.0:
                    frame = (frame * 255).astype(np.uint8)
                video_frames.append(frame)
            else:
                video_frames.append(np.array(frame))
    elif isinstance(frames, np.ndarray):
        if frames.max() <= 1.0:
            frames = (frames * 255).astype(np.uint8)
        video_frames = [frames[i] for i in range(frames.shape[0])]
    else:
        raise ValueError(f"Tipo de frames não suportado: {type(frames)}")
    
    if not video_frames:
        raise ValueError("Nenhum frame gerado!")
    
    print(f"📹 Exportando {len(video_frames)} frames para {output_path}...")
    
    # Usar ffmpeg via imageio para MP4
    writer = imageio.get_writer(output_path, fps=fps, codec='libx264',
                                 quality=7, pixelformat='yuv420p',
                                 output_params=['-preset', 'fast'])
    for frame in video_frames:
        writer.append_data(frame)
    writer.close()
    
    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"✅ Vídeo exportado: {output_path} ({file_size:.1f}MB, {len(video_frames)} frames)")
    return output_path


def list_models():
    """Lista modelos disponíveis"""
    print("\n📋 Modelos disponíveis:")
    print("=" * 60)
    for key, info in MODELS.items():
        print(f"\n  {key}:")
        print(f"    Repo: {info['repo']}")
        print(f"    Descrição: {info['description']}")
        print(f"    Frames padrão: {info['default_frames']}")
        print(f"    Resolução: {info['default_width']}x{info['default_height']}")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="VideoForge - Gerador de Vídeo Local com IA Open Source"
    )
    parser.add_argument("--prompt", type=str, default="",
                        help="Prompt para gerar o vídeo")
    parser.add_argument("--output", type=str, default="",
                        help="Caminho do arquivo de saída (ex: /media/clip.mp4)")
    parser.add_argument("--model", type=str, default="modelscope",
                        choices=list(MODELS.keys()),
                        help="Modelo a usar (default: modelscope)")
    parser.add_argument("--num_frames", type=int, default=None,
                        help="Número de frames a gerar")
    parser.add_argument("--height", type=int, default=None,
                        help="Altura do vídeo em pixels")
    parser.add_argument("--width", type=int, default=None,
                        help="Largura do vídeo em pixels")
    parser.add_argument("--steps", type=int, default=25,
                        help="Passos de inferência (default: 25, menos=mais rápido)")
    parser.add_argument("--guidance", type=float, default=9.0,
                        help="Guidance scale (default: 9.0)")
    parser.add_argument("--list-models", action="store_true",
                        help="Lista modelos disponíveis")
    
    args = parser.parse_args()
    
    if args.list_models:
        list_models()
        sys.exit(0)
    
    if not args.prompt or not args.output:
        parser.error("--prompt e --output são obrigatórios para gerar vídeo")
    
    model_info = MODELS[args.model]
    num_frames = args.num_frames or model_info["default_frames"]
    height = args.height or model_info["default_height"]
    width = args.width or model_info["default_width"]
    
    # Limitar frames ao máximo do modelo
    num_frames = min(num_frames, model_info["max_frames"])
    
    print(f"\n{'='*60}")
    print(f"🤖 VideoForge - Geração Local de Vídeo")
    print(f"{'='*60}")
    print(f"  Modelo: {args.model} ({model_info['description']})")
    print(f"  Frames: {num_frames}")
    print(f"  Resolução: {width}x{height}")
    print(f"  Steps: {args.steps}")
    print(f"  Guidance: {args.guidance}")
    print(f"  Saída: {args.output}")
    print(f"  Device: {'CUDA' if torch.cuda.is_available() else 'CPU'}")
    if not torch.cuda.is_available():
        print(f"  ⚠️  Sem GPU detectada - geração será lenta!")
    print(f"{'='*60}\n")
    
    try:
        if args.model == "modelscope":
            generate_with_modelscope(
                args.prompt, args.output,
                num_frames=num_frames, height=height, width=width,
                num_inference_steps=args.steps, guidance_scale=args.guidance
            )
        elif args.model == "zeroscope":
            generate_with_zeroscope(
                args.prompt, args.output,
                num_frames=num_frames, height=height, width=width,
                num_inference_steps=args.steps, guidance_scale=args.guidance
            )
        elif args.model == "cogvideox":
            generate_with_cogvideox(
                args.prompt, args.output,
                num_frames=num_frames, height=height, width=width,
                num_inference_steps=args.steps, guidance_scale=args.guidance
            )
        
        # Output JSON para o backend parsear
        result = {
            "status": "success",
            "output": args.output,
            "model": args.model,
            "frames": num_frames,
            "resolution": f"{width}x{height}"
        }
        print(f"\n__RESULT_JSON__{json.dumps(result)}__END_JSON__")
        
    except Exception as e:
        error_result = {
            "status": "error",
            "error": str(e),
            "model": args.model
        }
        print(f"\n__RESULT_JSON__{json.dumps(error_result)}__END_JSON__")
        sys.exit(1)


if __name__ == "__main__":
    main()
