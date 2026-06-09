FROM php:8.2-apache

# Extensao do MySQL
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Instala Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Habilita mod_rewrite e porta 8081 para a Flowgate
RUN a2enmod rewrite && \
    echo "Listen 8081" >> /etc/apache2/ports.conf

# Configuracao dos VirtualHosts (Automax + Flowgate)
COPY apache.conf /etc/apache2/sites-available/000-default.conf

EXPOSE 80 8081