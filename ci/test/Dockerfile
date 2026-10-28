# Conteneur de tests (CI) : appelle la stack à travers le proxy et vérifie les réponses.
FROM base

RUN apk add --no-cache curl jq

COPY entrypoint.sh tests.sh /

ENV TARGET_URL=http://proxy TEST_TIMEOUT=10
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/tests.sh"]
