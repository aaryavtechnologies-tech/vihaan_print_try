const { spawn } = require("child_process");
const path = require("path");

console.log("🚀 Starting Next.js server with Render auto-ping background process...");

// 1. Spawn ping.js process
const pingProcess = spawn("node", [path.join(__dirname, "ping-render.js")], {
  stdio: "inherit",
  shell: true,
});

// 2. Spawn next start process
const nextProcess = spawn("npx", ["next", "start"], {
  stdio: "inherit",
  shell: true,
});

nextProcess.on("exit", (code) => {
  if (pingProcess) {
    pingProcess.kill();
  }
  process.exit(code || 0);
});

pingProcess.on("error", (err) => {
  console.error("Auto-ping process error:", err.message);
});
