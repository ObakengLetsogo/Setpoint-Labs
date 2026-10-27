// PM2 process file: pm2 start deploy/ecosystem.config.cjs, then pm2 save.
// Two instances so `pm2 reload setpoint` restarts one at a time with no downtime.
module.exports = {
  apps: [
    {
      name: "setpoint",
      cwd: "/srv/setpoint/app",
      script: ".next/standalone/server.js",
      instances: 2,
      exec_mode: "cluster",
      env_file: "/etc/setpoint/env",
      env: { NODE_ENV: "production", PORT: "3000", HOSTNAME: "127.0.0.1" },
      max_memory_restart: "700M",
      kill_timeout: 10000,
      listen_timeout: 15000,
      out_file: "/var/log/setpoint/out.log",
      error_file: "/var/log/setpoint/error.log",
      time: true,
    },
  ],
};
