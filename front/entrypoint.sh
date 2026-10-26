#!/bin/sh
set -e

for var in PORT NODE_MAX_MEMORY; do
    eval "val=\$$var"
    case "$val" in
        ''|*[!0-9]*) echo "Erreur : $var doit être un nombre (reçu : '$val')" >&2; exit 1 ;;
    esac
done

# Node lit ses options dans NODE_OPTIONS : on limite la taille du tas JavaScript (en Mo).
export NODE_OPTIONS="--max-old-space-size=$NODE_MAX_MEMORY"

echo "front : port $PORT, $NODE_MAX_MEMORY Mo de mémoire max pour node"

exec "$@"
