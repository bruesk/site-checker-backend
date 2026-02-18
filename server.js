const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const REFRESH_INTERVAL = 60000; // 60 seconds

let cachedResults = [];
let nextRefreshTime = Date.now();

/* =========================
   SERVICES
========================= */

const services = [
  { key: "discord", name: "Discord", type: "statuspage", url: "https://discordstatus.com/api/v2/summary.json" },
  { key: "cloudflare", name: "Cloudflare", type: "statuspage", url: "https://www.cloudflarestatus.com/api/v2/summary.json" },
  { key: "github", name: "GitHub", type: "statuspage", url: "https://www.githubstatus.com/api/v2/summary.json" },
  { key: "openai", name: "OpenAI", type: "statuspage", url: "https://status.openai.com/api/v2/summary.json" },
  { key: "reddit", name: "Reddit", type: "statuspage", url: "https://www.redditstatus.com/api/v2/summary.json" },
  { key: "twitch", name: "Twitch", type: "statuspage", url: "https://status.twitch.tv/api/v2/summary.json" },
  { key: "aws", name: "Amazon Web Services (AWS)", type: "aws", url: "https://status.aws.amazon.com/data.json" },
  { key: "gcloud", name: "Google Cloud", type: "gcloud", url: "https://status.cloud.google.com/incidents.json" }
];

/* =========================
   STATUS MAPPING
========================= */

function mapStatus(indicator) {
  if (indicator === "none") return "Operational";
  if (indicator === "minor") return "Minor Issues";
  if (indicator === "major") return "Major Outage";
  if (indicator === "critical") return "Critical Outage";
  return "Operational";
}

/* =========================
   CHECK LOGIC
========================= */

async function checkService(service) {
  try {
    const res = await axios.get(service.url, {
      timeout: 8000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json"
      }
    });

    if (service.type === "statuspage") {
      const indicator = res.data.status?.indicator || "none";
      return { key: service.key, status: mapStatus(indicator) };
    }

    if (service.type === "aws") {
      let hasIssue = false;
      const data = res.data;

      for (const region in data) {
        if (!data[region].services) continue;
        for (const svc in data[region].services) {
          if (data[region].services[svc] !== "available") {
            hasIssue = true;
            break;
          }
        }
        if (hasIssue) break;
      }

      return {
        key: service.key,
        status: hasIssue ? "Minor Issues" : "Operational"
      };
    }

    if (service.type === "gcloud") {
      const incidents = res.data;
      return {
        key: service.key,
        status: incidents.length > 0 ? "Minor Issues" : "Operational"
      };
    }

  } catch {
    return { key: service.key, status: "Error" };
  }
}

/* =========================
   REFRESH SYSTEM
========================= */

async function refreshAll() {
  const results = await Promise.all(services.map(checkService));
  cachedResults = results;
  nextRefreshTime = Date.now() + REFRESH_INTERVAL;
}

setInterval(refreshAll, REFRESH_INTERVAL);
refreshAll();

/* =========================
   ROUTES
========================= */

app.get("/api/status", (req, res) => {
  const secondsRemaining = Math.max(
    0,
    Math.floor((nextRefreshTime - Date.now()) / 1000)
  );

  res.json({
    services: cachedResults,
    nextRefreshIn: secondsRemaining
  });
});

/* =========================
   START
========================= */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
