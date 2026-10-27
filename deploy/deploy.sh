#!/usr/bin/env bash
# Pulls, builds and reloads with no downtime. Run as the setpoint user from /srv/setpoint/app.
set -euo pipefail
cd /srv/setpoint/app

set -a; source /etc/setpoint/env; set +a

git fetch --quiet origin
git checkout --quiet "${DEPLOY_BRANCH:-feature/motor-starter-bench}"
git pull --quiet --ff-only

npm ci --no-audit --no-fund
npm run build

# The standalone server needs the static files and public folder beside it.
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

npm run db:migrate
npm run db:seed

pm2 reload deploy/ecosystem.config.cjs --update-env
sleep 3
curl -fsS http://127.0.0.1:3000/api/health > /dev/null && echo "deployed and healthy"
