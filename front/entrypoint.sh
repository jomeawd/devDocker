#!/bin/sh
set -e

# check_number NOM VALEUR : arrête le conteneur si VALEUR n'est pas un nombre.
check_number() {
    case "$2" in
        ''|*[!0-9]*) echo "Erreur : $1 doit être un nombre (reçu : '$2')" >&2; exit 1 ;;
    esac
}

check_number PORT "$PORT"
check_number NODE_MAX_MEMORY "$NODE_MAX_MEMORY"

# Node lit ses options dans NODE_OPTIONS : on limite la taille du tas JavaScript (en Mo).
export NODE_OPTIONS="--max-old-space-size=$NODE_MAX_MEMORY"

echo "front : port $PORT, $NODE_MAX_MEMORY Mo de mémoire max pour node"

exec "$@"
