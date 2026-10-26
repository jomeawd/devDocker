FROM alpine:3.22

RUN apk add --no-cache nginx gettext

COPY nginx.conf.template /etc/nginx/nginx.conf.template

ENV NGINX_WORKER_PROCESSES=1 FRONT_PORT=3000
EXPOSE 80
STOPSIGNAL SIGQUIT
CMD envsubst '$NGINX_WORKER_PROCESSES $FRONT_PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && exec nginx -g 'daemon off;'
