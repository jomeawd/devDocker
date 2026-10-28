# Conteneur de lint (CI) : vérifie le code de tout le projet, monté en lecture seule dans /lint/code.
FROM base

RUN apk add --no-cache shellcheck yamllint php83 nodejs npm

WORKDIR /lint
COPY package.json eslint.config.js ./
RUN npm install --no-audit --no-fund
COPY entrypoint.sh lint.sh /

ENV NODE_MAX_MEMORY=128
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/lint.sh"]
