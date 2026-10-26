#!/bin/sh
set -e

case "$FPM_MAX_CHILDREN" in
    ''|*[!0-9]*|0) echo "Erreur : FPM_MAX_CHILDREN doit être un nombre > 0 (reçu : '$FPM_MAX_CHILDREN')" >&2; exit 1 ;;
esac

case "$PHP_MEMORY_LIMIT" in
    *[0-9]M|*[0-9]G) ;;
    *) echo "Erreur : PHP_MEMORY_LIMIT doit être de la forme 64M ou 1G (reçu : '$PHP_MEMORY_LIMIT')" >&2; exit 1 ;;
esac

if [ "$FLIGHT_PROVIDER" = "travelpayouts" ] && [ -z "$TRAVELPAYOUTS_TOKEN" ]; then
    echo "Attention : FLIGHT_PROVIDER=travelpayouts sans TRAVELPAYOUTS_TOKEN, les recherches vont échouer" >&2
fi

echo "back : $FPM_MAX_CHILDREN workers max, $PHP_MEMORY_LIMIT par worker, provider $FLIGHT_PROVIDER"

exec "$@"
