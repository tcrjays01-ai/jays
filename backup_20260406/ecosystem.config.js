module.exports = {
  apps: [
    {
      name: 'cosmic-server',
      script: 'server.js',
      cwd: 'd:\\사이드 프로젝트\\COSMIC',
      autorestart: true,
      max_restarts: 999,
      restart_delay: 2000,
    },
    {
      name: 'cosmic-tunnel',
      script: 'tunnel_cf.js',
      cwd: 'd:\\사이드 프로젝트\\COSMIC',
      autorestart: true,
      max_restarts: 999,
      restart_delay: 3000,
    }
  ]
};
