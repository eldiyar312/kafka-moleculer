/**
 * PM2 application configuration
 * http://pm2.keymetrics.io/docs/usage/application-declaration/
 */
module.exports = {
  apps: [
    {
      script: 'npm',
      args: ['run', 'dev'],
      name: `aqsi-core`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
    },
  ],
}
