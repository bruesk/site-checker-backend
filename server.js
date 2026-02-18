const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* =========================
   WEBSITE CHECK ROUTE
========================= */

app.post("/check", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "No URL provided" });
  }

  try {
    const start = Date.now();
    const response = await fetch(url);
    const end = Date.now();

    res.json({
      status: response.ok ? "UP" : "DOWN",
      code: response.status,
      responseTime: end - start
    });

  } catch {
    res.json({
      status: "DOWN",
      code: null,
      responseTime: null
    });
  }
});

/* =========================
   STATUSPAGE SERVICES
========================= */

const services = {
  discord: "https://discordstatus.com/api/v2/summary.json",
  cloudflare: "https://www.cloudflarestatus.com/api/v2/summary.json",
  github: "https://www.githubstatus.com/api/v2/summary.json",
  openai: "https://status.openai.com/api/v2/summary.json",
  reddit: "https://www.redditstatus.com/api/v2/summary.json",
  twitch: "https://status.twitch.tv/api/v2/summary.json"
};

let cachedStatus = {};
let lastUpdated = 0;
const REFRESH_INTERVAL = 60000;

/* =========================
   NORMALIZER
========================= */

function normalize(indicator) {
  switch (indicator) {
    case "none":
      return "Operational";
    case "minor":
      return "Minor Issues";
    case "major":
      return "Major Outage";
    case "critical":
      return "Critical Outage";
    default:
      return "Unknown";
  }
}

/* =========================
   FETCH ALL SERVICES
========================= */

async function fetchAllServices() {
  const results = {};

  for (const key in services) {
    try {
      const response = await fetch(services[key], {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const data = await response.json();
      const indicator = data.status.indicator;
      results[key] = normalize(indicator);
    } catch {
      results[key] = "Error";
    }
  }

  cachedStatus = results;
  lastUpdated = Date.now();
  console.log("Services updated at", new Date(lastUpdated).toISOString());
}

fetchAllServices();
setInterval(fetchAllServices, REFRESH_INTERVAL);

/* =========================
   PUBLIC ROUTE
========================= */

app.get("/all-status", (req, res) => {
  const now = Date.now();
  const nextRefreshIn = Math.max(
    0,
    REFRESH_INTERVAL - (now - lastUpdated)
  );

  res.json({
    statuses: cachedStatus,
    lastUpdated,
    nextRefreshIn
  });
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
