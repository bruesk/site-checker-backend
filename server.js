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

  } catch (err) {
    res.json({
      status: "DOWN",
      error: "Website unreachable"
    });
  }
});

/* =========================
   SERVICE STATUS MAP
========================= */

const statuspageServices = {
  discord: "https://discordstatus.com/api/v2/summary.json",
  cloudflare: "https://www.cloudflarestatus.com/api/v2/summary.json",
  github: "https://www.githubstatus.com/api/v2/summary.json",
  openai: "https://status.openai.com/api/v2/summary.json",
  twitter: "https://api.twitterstat.us/api/v2/summary.json",
  reddit: "https://www.redditstatus.com/api/v2/summary.json",
  twitch: "https://status.twitch.tv/api/v2/summary.json",
  meta: "https://metastatus.com/api/v2/summary.json"
};

/* =========================
   SERVICE STATUS ROUTE
========================= */

app.post("/service-status", async (req, res) => {
  const { service } = req.body;

  if (!service) {
    return res.status(400).json({ error: "No service specified" });
  }

  try {
    /* -------- Statuspage Services -------- */
    if (statuspageServices[service]) {
      const response = await fetch(statuspageServices[service]);
      const data = await response.json();

      const indicator = data.status.indicator;

      return res.json({
        name: service,
        status: normalizeIndicator(indicator),
        raw: indicator
      });
    }

    /* -------- Steam -------- */
    if (service === "steam") {
      const response = await fetch("https://steamstat.us/api/v2/");
      const data = await response.json();

      const steamOnline = data.services.SteamAPI.status === "good";

      return res.json({
        name: "steam",
        status: steamOnline ? "Operational" : "Issues Detected"
      });
    }

    /* -------- AWS -------- */
    if (service === "aws") {
      const response = await fetch("https://health.aws.amazon.com/health/status");
      const text = await response.text();

      return res.json({
        name: "aws",
        status: text.includes("No current issues")
          ? "Operational"
          : "Check AWS Status Page"
      });
    }

    /* -------- Apple -------- */
    if (service === "apple") {
      return res.json({
        name: "apple",
        status: "Check Apple System Status Page"
      });
    }

    /* -------- PlayStation -------- */
    if (service === "psn") {
      return res.json({
        name: "psn",
        status: "Check PlayStation Status Page"
      });
    }

    return res.status(400).json({ error: "Unknown service" });

  } catch (err) {
    res.status(500).json({
      name: service,
      status: "Error fetching status"
    });
  }
});

/* =========================
   NORMALIZER
========================= */

function normalizeIndicator(indicator) {
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
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
