FROM node:20-alpine

# Instala Docker CLI para comunicar com o python-worker via socket
RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
