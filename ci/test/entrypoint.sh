#!/bin/sh
set -e

case "$TEST_TIMEOUT" in
    ''|*[!0-9]*|0) echo "Erreur : TEST_TIMEOUT doit être un nombre > 0 (reçu : '$TEST_TIMEOUT')" >&2; exit 1 ;;
esac

case "$TARGET_URL" in
    http://*|https://*) ;;
    *) echo "Erreur : TARGET_URL doit commencer par http:// ou https:// (reçu : '$TARGET_URL')" >&2; exit 1 ;;
esac

echo "test : cible $TARGET_URL, timeout $TEST_TIMEOUT s par requête"

exec "$@"
