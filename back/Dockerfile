# "base" = notre image faite maison (dossier base/), fournie par le compose.
FROM base

RUN apk add --no-cache composer php83-fpm php83-ctype php83-iconv php83-tokenizer php83-dom php83-xml php83-mbstring php83-curl

WORKDIR /app
COPY . .
RUN composer install --no-dev --no-interaction && php83 bin/console cache:warmup && chown -R nobody var
COPY www.conf /etc/php83/php-fpm.d/www.conf
COPY entrypoint.sh /entrypoint.sh

ENV FPM_MAX_CHILDREN=4 PHP_MEMORY_LIMIT=48M FLIGHT_PROVIDER=mock
EXPOSE 9000
STOPSIGNAL SIGQUIT
ENTRYPOINT ["/entrypoint.sh"]
CMD ["php-fpm83", "-F"]
