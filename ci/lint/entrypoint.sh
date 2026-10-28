#!/bin/sh
set -e

case "$NODE_MAX_MEMORY" in
    ''|*[!0-9]*) echo "Erreur : NODE_MAX_MEMORY doit être un nombre (reçu : '$NODE_MAX_MEMORY')" >&2; exit 1 ;;
esac

if [ ! -d /lint/code ]; then
    echo "Erreur : le code du projet doit être monté dans /lint/code" >&2
    exit 1
fi

export NODE_OPTIONS="--max-old-space-size=$NODE_MAX_MEMORY"
echo "lint : $NODE_MAX_MEMORY Mo max pour eslint"

exec "$@"
