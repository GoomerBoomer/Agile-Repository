module.exports = {
  apps: [
    {
      name: "agile-app",
      script: "npx",
      args: "tsx app.ts",
      env: {
        NODE_ENV: "production",
        PORT: 8000,
      },
      watch: false,
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
