#!/bin/bash
docker compose -f /root/videoforge/docker-compose.vps.yml exec -T postgres psql -U videoforge -d videoforge <<'SQL'
SELECT id, substring(titulo from 1 for 40) as titulo, status, created_at FROM news_videos ORDER BY created_at DESC LIMIT 5;
SQL
