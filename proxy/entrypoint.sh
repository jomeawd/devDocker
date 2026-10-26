#!/bin/sh
set -e

# Vérifie que les arguments reçus sont bien des nombres.
for var in NGINX_WORKER_PROCESSES FRONT_PORT; do
    eval "val=\$$var"
    case "$val" in
        ''|*[!0-9]*) echo "Erreur : $var doit être un nombre (reçu : '$val')" >&2; exit 1 ;;
    esac
done

# Génère la config nginx à partir du template, puis la teste avant de démarrer.
envsubst '$NGINX_WORKER_PROCESSES $FRONT_PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
nginx -t -q

echo "proxy : $NGINX_WORKER_PROCESSES workers, front sur le port $FRONT_PORT"

# exec : la commande (CMD) remplace le script et devient le PID 1, elle reçoit donc les signaux.
exec "$@"
