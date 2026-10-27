#!/usr/bin/env bash
# Nightly MySQL backup, kept 14 days. Cron: 15 2 * * * /srv/setpoint/app/deploy/backup.sh
set -euo pipefail
DIR=/var/backups/setpoint
mkdir -p "$DIR"
STAMP=$(date +%F-%H%M)
# Credentials come from /root/.my.cnf or the backup user's ~/.my.cnf, never the command line.
mysqldump --single-transaction --routines --triggers --set-gtid-purged=OFF setpoint | gzip -9 > "$DIR/setpoint-$STAMP.sql.gz"
chmod 600 "$DIR/setpoint-$STAMP.sql.gz"
find "$DIR" -name 'setpoint-*.sql.gz' -mtime +14 -delete
