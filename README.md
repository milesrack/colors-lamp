# COLORS Lab

A LAMP web application for managing your favourite colours.

## Tech Stack

- Linux
- Apache
- MySQL
- PHP
- HTML, CSS and JavaScript

## Setup

### Prerequisites

- A VPS running Ubuntu 24.04
- SSH access with sudo privileges
- A domain pointing to your VPS's IP address
- Inbound TCP ports 80 and 443 allowed through any server or provider firewalls

### Install dependencies

```sh
sudo apt update
sudo apt install -y apache2 mysql-server php libapache2-mod-php php-mysql composer git unzip vim openssl
sudo systemctl enable --now apache2 mysql
```

### Clone the repository

```sh
sudo mkdir -p /var/www/colors-lamp
sudo chown "$USER":www-data /var/www/colors-lamp
git clone https://github.com/milesrack/colors-lamp.git /var/www/colors-lamp
cd /var/www/colors-lamp
composer install
```

### Configure the database

```sh
sudo mysql -e "CREATE DATABASE colors CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql colors < database/schema.sql
openssl rand -hex 24
```

Copy the generated database password, then open MySQL:

```sh
sudo mysql
```

Replace `DB_PASSWORD` with your generated password:

```sql
CREATE USER 'colors_app'@'localhost' IDENTIFIED BY 'DB_PASSWORD';
GRANT SELECT ON colors.Users TO 'colors_app'@'localhost';
GRANT SELECT, INSERT ON colors.Colors TO 'colors_app'@'localhost';
EXIT;
```

### Configure environment variables

```sh
cp .env.example .env
vim .env
```

Configure the following values, replacing the `DB_PASSWORD` placeholder with your generated password:

```dotenv
DB_HOST=localhost
DB_NAME=colors
DB_USER=colors_app
DB_PASSWORD='DB_PASSWORD'
```

### Create an application account

Run the following command and enter the password you would like to log in with:

```sh
php -r 'echo password_hash(readline("Password: "), PASSWORD_BCRYPT), PHP_EOL;'
```

Copy the bcrypt hash and open MySQL:

```sh
sudo mysql colors
```

Replace `PASSWORD_HASH` with the hash you copied:

```sql
INSERT INTO Users (firstName, lastName, Login, Password)
VALUES ('Demo', 'User', 'demo', 'PASSWORD_HASH');
EXIT;
```

This will create the user `demo` with the password you entered.

### Configure Apache

Set ownership and permissions:

```sh
sudo chown -R "$USER":www-data /var/www/colors-lamp
sudo chmod -R u=rwX,g=rX,o= /var/www/colors-lamp
```

Create the Apache site configuration:

```sh
sudo vim /etc/apache2/sites-available/colors-lamp.conf
```

Add the following configuration, replacing `YOUR_DOMAIN` with your domain:

```apache
<VirtualHost *:80>
    ServerName YOUR_DOMAIN
    DocumentRoot /var/www/colors-lamp/public

    Alias "/api/" "/var/www/colors-lamp/api/"

    <Directory /var/www/colors-lamp/public>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    <Directory /var/www/colors-lamp/api>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/colors-lamp-error.log
    CustomLog ${APACHE_LOG_DIR}/colors-lamp-access.log combined
</VirtualHost>
```

Enable the site:

```sh
sudo a2dissite 000-default.conf
sudo a2ensite colors-lamp.conf
sudo systemctl reload apache2
```

If UFW is enabled, allow HTTP traffic:

```sh
sudo ufw allow 80/tcp
```

### Configure HTTPS

If UFW is enabled, allow HTTPS traffic:

```sh
sudo ufw allow 443/tcp
```

Install Certbot:

```sh
sudo apt install -y certbot python3-certbot-apache
```

Replace `YOUR_DOMAIN` with the domain used in the Apache configuration:

```sh
sudo certbot --apache --redirect -d YOUR_DOMAIN
```

Follow the Certbot prompts. Once Certbot finishes, your certificates will be installed and HTTP-to-HTTPS redirection will be configured.

Enable automatic certificate renewal:

```sh
sudo systemctl enable --now certbot.timer
```

## Running

Open `https://YOUR_DOMAIN`, replacing `YOUR_DOMAIN` with your domain.

Log in as `demo` using the password you chose. Add a colour, then search for it.

## Assumptions and Limitations

- No registration functionality, so accounts are created in manually MySQL.
- No server-side session management.
- Limited validation and error handling.
- Colours cannot be deleted.

## License

This project is licensed under the [MIT License](LICENSE.md).
