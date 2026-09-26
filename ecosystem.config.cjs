/**
 * PM2 process definitions for Exposed.
 *
 * Two processes on purpose:
 *   exposed-web     the Next.js server (port 3101, behind nginx)
 *   exposed-worker  the scan queue loop
 *
 * The worker is separate so a `next build` restart of the web process can
 * never interrupt a scan mid-flight, and so a crash loop in one does not take
 * the other down. The worker runs one scan at a time by design: it is polite
 * to customer infrastructure and gentle on a 1 vCPU box.
 *
 * Start with:  pm2 start ecosystem.config.cjs
 * Both processes must run with cwd=/root/exposed, because the migration runner
 * and the database path are both resolved relative to the project root.
 */
module.exports = {
  apps: [
    {
      name: "exposed-web",
      script: "node_modules/.bin/next",
      args: "start -p 3101",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "700M",
      max_restarts: 10,
      min_uptime: "20s",
      delay_restart: 3000,
      kill_timeout: 10000,
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: "3101",
      },
    },
    {
      name: "exposed-worker",
      script: "node_modules/.bin/tsx",
      args: "src/worker/index.ts",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "400M",
      max_restarts: 10,
      min_uptime: "20s",
      // Give a scan time to finish before escalating, so a slow domain is not
      // mistaken for a hung process and killed mid-write.
      kill_timeout: 30000,
      time: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
