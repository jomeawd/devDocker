#!/bin/sh
set -e

# check_number NOM VALEUR : arrête le conteneur si VALEUR n'est pas un nombre.
check_number() {
    case "$2" in
        ''|*[!0-9]*) echo "Erreur : $1 doit être un nombre (reçu : '$2')" >&2; exit 1 ;;
    esac
}

check_number NGINX_WORKER_PROCESSES "$NGINX_WORKER_PROCESSES"
check_number FRONT_PORT "$FRONT_PORT"

# Génère la config nginx à partir du template, puis la teste avant de démarrer.
# Les guillemets simples sont voulus : envsubst reçoit la liste des variables à remplacer, pas leurs valeurs.
# shellcheck disable=SC2016
envsubst '$NGINX_WORKER_PROCESSES $FRONT_PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
nginx -t -q

echo "proxy : $NGINX_WORKER_PROCESSES workers, front sur le port $FRONT_PORT"

# exec : la commande (CMD) remplace le script et devient le PID 1, elle reçoit donc les signaux.
exec "$@"
