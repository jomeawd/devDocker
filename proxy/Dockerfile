# "base" = notre image faite maison (dossier base/), fournie par le compose.
FROM base

RUN apk add --no-cache nginx gettext

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh

ENV NGINX_WORKER_PROCESSES=1 FRONT_PORT=3000
EXPOSE 80
STOPSIGNAL SIGQUIT
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
