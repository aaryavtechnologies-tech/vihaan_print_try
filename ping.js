const https = require("https");

const RENDER_URL = process.env.RENDER_URL || "https://vihaan-print-try.onrender.com/api/ping";
const INTERVAL_MS = (parseInt(process.env.PING_INTERVAL_MINUTES || "5", 10)) * 60 * 1000;

function pingServer() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Pinging ${RENDER_URL}...`);

  const url = new URL(RENDER_URL);
  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname + url.search,
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RenderPing/1.0",
      "Accept": "application/json, text/plain, */*",
    },
  };

  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[${new Date().toISOString()}] ✅ PING SUCCESS (${res.statusCode}): ${data.trim()}`);
      } else {
        console.error(`[${new Date().toISOString()}] ❌ PING FAILED (${res.statusCode}): ${data.trim()}`);
      }
    });
  });

  req.on("error", (err) => {
    console.error(`[${new Date().toISOString()}] ⚠️ PING ERROR: ${err.message}`);
  });

  req.end();
}

// Initial ping
pingServer();

// Check if --once flag passed
if (process.argv.includes("--once")) {
  console.log("Single ping mode completed.");
} else {
  console.log(`🚀 Render Keep-Alive active! Pinging every ${INTERVAL_MS / 60000} minutes...`);
  console.log("Press Ctrl+C to stop.\n");
  setInterval(pingServer, INTERVAL_MS);
}
