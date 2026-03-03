#!/bin/bash
# Verificar dados do último vídeo de news
docker compose -f /root/videoforge/docker-compose.vps.yml exec -T postgres psql -U videoforge -d videoforge <<'SQL'
SELECT 
  id, 
  status,
  substring(titulo from 1 for 50) as titulo,
  total_noticias,
  audio_url IS NOT NULL as tem_audio,
  roteiro IS NOT NULL as tem_roteiro,
  video_url IS NOT NULL as tem_video,
  created_at
FROM news_videos 
WHERE id = '466f4952-2574-4842-808f-58ec808fe597';
SQL
