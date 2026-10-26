FROM alpine:3.22

RUN apk add --no-cache nginx gettext

COPY nginx.conf.template /etc/nginx/nginx.conf.template

ENV NGINX_WORKER_PROCESSES=1
EXPOSE 80
STOPSIGNAL SIGQUIT
CMD envsubst '$NGINX_WORKER_PROCESSES' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && exec nginx -g 'daemon off;'
