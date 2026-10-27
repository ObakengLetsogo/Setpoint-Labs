# Deploying Setpoint Labs on a Hostinger VPS

This guide takes a fresh Ubuntu 24.04 LTS VPS to a running site with HTTPS, MySQL, payments, email,
backups and zero downtime updates. Commands run as root unless a step says otherwise. Replace
`setpointlabs.co.za` everywhere if the final domain is different; in the app it lives in one place,
`NEXT_PUBLIC_SITE_URL` and `APP_URL` in `/etc/setpoint/env`.

## 1. Harden the server

```bash
adduser deploy && usermod -aG sudo deploy
# From your own computer: ssh-copy-id deploy@<VPS IP>, then check you can log in with the key.
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/; s/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh

apt update && apt -y upgrade
apt -y install ufw fail2ban unattended-upgrades nginx git curl
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
systemctl enable --now fail2ban
dpkg-reconfigure -plow unattended-upgrades
```

## 2. Node and PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt -y install nodejs
npm install -g pm2
pm2 install pm2-logrotate          # rotates app logs daily, keeps 14
pm2 set pm2-logrotate:retain 14
```

## 3. MySQL 8.4 LTS

Ubuntu's own package is 8.0, so add MySQL's APT repository and choose the 8.4 LTS series when asked.

```bash
cd /tmp && curl -LO https://dev.mysql.com/get/mysql-apt-config_0.8.33-1_all.deb   # check the current file name on dev.mysql.com
dpkg -i mysql-apt-config_*.deb && apt update && apt -y install mysql-server
mysql_secure_installation
```

Keep it on localhost only. In `/etc/mysql/mysql.conf.d/mysqld.cnf` set `bind-address = 127.0.0.1`,
then `systemctl restart mysql`. Create the database and a least privilege user:

```sql
CREATE DATABASE setpoint CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'setpoint'@'localhost' IDENTIFIED BY '<long random password>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES ON setpoint.* TO 'setpoint'@'localhost';
```

`CREATE`, `ALTER`, `INDEX`, `DROP` and `REFERENCES` are there for migrations. To tighten further, run migrations with a
separate user and give the app user only `SELECT, INSERT, UPDATE, DELETE`.

## 4. The app user, code and secrets

```bash
adduser --system --group --home /srv/setpoint setpoint
mkdir -p /etc/setpoint /var/log/setpoint /var/lib/setpoint/videos /var/backups/setpoint
chown setpoint:setpoint /var/log/setpoint /var/lib/setpoint/videos
# The repository is private: add a read only deploy key for the setpoint user in GitHub first
# (Settings, Deploy keys), then clone over SSH.
sudo -u setpoint git clone git@github.com:ObakengLetsogo/Setpoint-Labs.git /srv/setpoint/app
cp /srv/setpoint/app/.env.example /etc/setpoint/env
chown root:setpoint /etc/setpoint/env && chmod 640 /etc/setpoint/env
```

Fill in `/etc/setpoint/env`:

| Variable | Value |
| --- | --- |
| `APP_URL`, `NEXT_PUBLIC_SITE_URL` | `https://setpointlabs.co.za` |
| `DATABASE_URL` | `mysql://setpoint:<password>@localhost:3306/setpoint` |
| `PAYMENT_PROVIDER` | `stitch` |
| `STITCH_CLIENT_ID`, `STITCH_CLIENT_SECRET` | from Stitch |
| `STITCH_WEBHOOK_SECRET` | from step 8 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | your mailbox, step 7 |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | your admin login, used by the seed |
| `VIDEO_DIR` | `/var/lib/setpoint/videos` |
| `VIDEO_ACCEL` | `1` |
| `VIDEO_URL_SECRET`, `CRON_SECRET` | two different values from `openssl rand -base64 36` |
| `VAT_NUMBER` | once registered |

## 5. Build and start

```bash
sudo -u setpoint bash -c 'cd /srv/setpoint/app && DEPLOY_BRANCH=feature/motor-starter-bench ./deploy/deploy.sh'   # first run fails at pm2 reload; that is fine
sudo -u setpoint pm2 start /srv/setpoint/app/deploy/ecosystem.config.cjs
sudo -u setpoint pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u setpoint --hp /srv/setpoint   # run the command it prints
```

`deploy.sh` builds, copies the static files next to the standalone server, runs migrations and the
seed, reloads PM2 one instance at a time, and checks `/api/health`. Use it for every update.

## 6. Nginx and HTTPS

```bash
cp /srv/setpoint/app/deploy/setpoint-proxy.conf /etc/nginx/snippets/
cp /srv/setpoint/app/deploy/nginx.conf /etc/nginx/sites-available/setpoint
ln -s /etc/nginx/sites-available/setpoint /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
apt -y install certbot python3-certbot-nginx
certbot --nginx -d setpointlabs.co.za -d www.setpointlabs.co.za --redirect -m you@setpointlabs.co.za --agree-tos
```

Certbot renews on its own timer; check with `certbot renew --dry-run`. Point the domain's `A`
(and `AAAA`) records at the VPS before running certbot.

## 7. Email from your domain

Use the SMTP details of the mailbox that sends as `hello@setpointlabs.co.za`. Then add these DNS
records so the mail is trusted:

- **SPF**, a `TXT` on the root: `v=spf1 include:<your mail provider's SPF host> -all`. Hostinger email uses `include:_spf.mail.hostinger.com`.
- **DKIM**, a `TXT` or `CNAME` your mail provider gives you, for example `hostingermail1._domainkey`. Copy it exactly.
- **DMARC**, a `TXT` on `_dmarc`: `v=DMARC1; p=quarantine; rua=mailto:dmarc@setpointlabs.co.za; adkim=s; aspf=s`. Start with `p=none` for a week, read the reports, then tighten.

Test by signing up with a Gmail address and checking "Show original": SPF, DKIM and DMARC should all say PASS.

## 8. Stitch payments

1. Ask Stitch to allowlist `https://setpointlabs.co.za/checkout/` as a redirect URI, and confirm whether recurring payments are enabled on your client. Today each payment buys a period, with renewal reminders and a 3 day grace; recurring debit can replace that later behind the same `PaymentProvider`.
2. Register the webhook and get its secret:
   ```bash
   cd /srv/setpoint/app && set -a && source /etc/setpoint/env && set +a && node scripts/stitch/subscribe-webhook.mjs
   ```
   Put the returned `whsec_...` value in `STITCH_WEBHOOK_SECRET` and run `pm2 reload setpoint --update-env`.
3. Test with Stitch's sandbox credentials first. Access is only ever granted when a signed webhook arrives at `/api/webhooks/stitch`; repeats are ignored and every event is logged in `payment_events` and `audit_log`.

## 9. Scheduled jobs

```bash
crontab -u setpoint -e
```
```
# Renewal reminders and lapses, daily at 07:10
10 7 * * * curl -fsS -X POST -H "Authorization: Bearer $(grep ^CRON_SECRET= /etc/setpoint/env | cut -d= -f2-)" https://setpointlabs.co.za/api/jobs/renewals > /dev/null
```

Backups run as root, with the MySQL credentials in `/root/.my.cnf` (mode 600):

```bash
printf '[mysqldump]\nuser=setpoint\npassword=<password>\n' > /root/.my.cnf && chmod 600 /root/.my.cnf
crontab -e
# 15 2 * * * /srv/setpoint/app/deploy/backup.sh
```

Dumps land in `/var/backups/setpoint` and are kept for 14 days. Copy them off the server too, for
example with Hostinger's snapshot backups or `rclone` to cloud storage. Back up `/var/lib/setpoint/videos` the same way.

## 10. Monitoring

- `https://setpointlabs.co.za/api/health` returns 200 when the app and database answer. Point a free uptime monitor at it.
- `pm2 monit` and `pm2 logs setpoint` for the app, `/var/log/nginx/` for traffic, `fail2ban-client status sshd` for SSH.

## Updating

```bash
sudo -u setpoint bash -c 'cd /srv/setpoint/app && ./deploy/deploy.sh'
```

## Launch checklist

- [ ] HTTPS works and `http://` and `www` redirect to `https://setpointlabs.co.za`
- [ ] Sign up, the confirmation email arrives (not in spam) and confirms
- [ ] A sandbox Stitch payment unlocks paid lessons only after the webhook, and a receipt arrives
- [ ] `/dev/pay` and `/dev/mail` return 404 in production
- [ ] Admin login works; grant and revoke change access straight away
- [ ] A certificate PDF downloads and `/verify/<code>` shows it
- [ ] An uploaded lesson video plays, and its link stops working after two hours
- [ ] Backups appear in `/var/backups/setpoint` the next morning
- [ ] The footer and first lesson say the site is for education, not live plant
