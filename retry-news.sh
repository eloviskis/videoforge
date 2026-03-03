#!/bin/bash
# Retry pipeline do último vídeo que parou no meio
set -e

TOKEN=$(docker exec videoforge-backend wget -qO- \
  --post-data='{"email":"eloi.santaroza@gmail.com","senha":"Pwk8q12v@"}' \
  --header='Content-Type: application/json' \
  http://localhost:3001/api/auth/login 2>/dev/null | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')

echo "TOKEN: ${TOKEN:0:30}..."

VIDEO_ID="466f4952-2574-4842-808f-58ec808fe597"
echo "Retomando video: $VIDEO_ID"

RESULT=$(docker exec videoforge-backend wget -qO- \
  --post-data='{}' \
  --header='Content-Type: application/json' \
  --header="Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/news/videos/$VIDEO_ID/retry" 2>&1)

echo "RESULT: $RESULT"
