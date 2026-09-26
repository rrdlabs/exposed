export async function register() {
  // Runs once per server instance, before it serves traffic, and only in the
  // Node.js runtime. The web process therefore never queries a table that has
  // not been created yet, which matters because PM2 restarts the web process
  // independently of the worker.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { runMigrations } = await import("@/lib/db/migrate");
  await runMigrations();
}
