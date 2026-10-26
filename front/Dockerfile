FROM alpine:3.22

RUN apk add --no-cache nodejs npm

WORKDIR /app
COPY . .
RUN npm ci && npm run build

ENV PORT=3000 NODE_MAX_MEMORY=96
EXPOSE 3000
CMD exec node --max-old-space-size=$NODE_MAX_MEMORY server.js
