"use strict";

module.exports = {
  apps: [
    {
      args: ["run", "apps/server/src/index.ts"],
      autorestart: true,
      cwd: "/app",
      env: {
        MINGZHAN_HOST: "0.0.0.0",
        MINGZHAN_PORT: "4310",
        NODE_ENV: "production",
      },
      name: "server",
      script: "bun",
    },
  ],
};
