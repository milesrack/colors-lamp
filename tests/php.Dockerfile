FROM php:8.3-cli-alpine
RUN docker-php-ext-install mysqli
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-progress
CMD ["php", "-S", "0.0.0.0:8080", "tests/router.php"]
