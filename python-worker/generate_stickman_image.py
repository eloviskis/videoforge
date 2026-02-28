#!/usr/bin/env python3
"""
Gera imagem stickman estática com Stable Diffusion
Uso: python generate_stickman_image.py <prompt> <output_path>
"""
import sys
import torch
from diffusers import StableDiffusionPipeline
from pathlib import Path

def generate_stickman_image(prompt: str, output_path: str):
    """Gera imagem stickman com SD"""
    print(f"🎨 Gerando imagem stickman: {prompt[:80]}...")
    
    # Usar modelo compacto para CPU
    model_id = "dreamlike-art/dreamlike-photoreal-2.0"
    
    # Pipeline otimizado para CPU
    pipe = StableDiffusionPipeline.from_pretrained(
        model_id,
        torch_dtype=torch.float32,
        safety_checker=None
    )
    pipe = pipe.to("cpu")
    
    # Prompt otimizado para stickman dark
    enhanced_prompt = f"""black stick figure stickman character, minimalist line art, 
{prompt}, dark background, dramatic lighting, high contrast, 
professional illustration, clean lines"""
    
    # Negative prompt
    negative = "realistic, photograph, 3d render, complex, detailed face, colorful, busy background"
    
    # Gerar imagem (baixa resolução para CPU)
    image = pipe(
        prompt=enhanced_prompt,
        negative_prompt=negative,
        num_inference_steps=15,  # Rápido
        guidance_scale=7.0,
        width=512,
        height=512
    ).images[0]
    
    # Salvar
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path)
    print(f"💾 Imagem salva: {output_path}")
    
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python generate_stickman_image.py <prompt> <output_path>")
        sys.exit(1)
    
    prompt = sys.argv[1]
    output_path = sys.argv[2]
    
    generate_stickman_image(prompt, output_path)
    print("✅ Concluído!")
