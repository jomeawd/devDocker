#!/bin/sh
# Lance tous les linters, continue même si l'un échoue, et sort en erreur s'il y a eu au moins un problème.

# PID 1 ignore SIGTERM par défaut : on l'intercepte pour s'arrêter proprement.
trap 'echo "lint : SIGTERM reçu, arrêt"; exit 143' TERM INT

cd /lint/code || exit 1
errors=0

step() {
    echo "== $1"
    shift
    if "$@"; then echo "   ok"; else echo "   ÉCHEC"; errors=$((errors + 1)); fi
}

step "shellcheck (scripts shell)" shellcheck ./*/entrypoint.sh ci/*/entrypoint.sh ci/*/*.sh
step "yamllint (compose + config Symfony)" yamllint -d "{extends: relaxed, rules: {line-length: {max: 120}}}" docker-compose.yml back/config
# Guillemets simples voulus : la boucle est exécutée par le sh -c, pas ici.
# shellcheck disable=SC2016
step "php -l (syntaxe PHP du back)" sh -c 'for f in $(find back/src back/public back/config -name "*.php"); do out=$(php83 -l "$f" 2>&1) || { echo "$out"; exit 1; }; done'
step "eslint (front React + serveur node)" sh -c 'cd /lint && npx eslint code/front/src code/front/server.js'

if [ "$errors" -gt 0 ]; then
    echo "lint : $errors étape(s) en échec"
    exit 1
fi
echo "lint : tout est propre"
