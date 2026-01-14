module.exports = {
  apps: [
    {
      name: "social-media-manager",
      script: "npm",
      args: "start",
      cwd: "/home/aziz/social-media-manager",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Logging
      log_file: "/home/aziz/social-media-manager/logs/combined.log",
      out_file: "/home/aziz/social-media-manager/logs/out.log",
      error_file: "/home/aziz/social-media-manager/logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
