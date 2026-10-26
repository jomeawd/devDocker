# "base" = notre image faite maison (dossier base/), fournie par le compose.
FROM base

RUN apk add --no-cache nodejs npm

WORKDIR /app
COPY . .
RUN npm ci && npm run build
COPY entrypoint.sh /entrypoint.sh

ENV PORT=3000 NODE_MAX_MEMORY=96
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
