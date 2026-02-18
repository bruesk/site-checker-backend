const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

/*
====================================
PRESET SERVICES
====================================
*/

const services = [
  // Atlassian Statuspage services
  { name: "Discord", url: "https://discordstatus.com/api/v2/summary.json", type: "statuspage" },
  { name: "Cloudflare", url: "https://www.cloudflarestatus.com/api/v2/summary.json", type: "statuspage" },
  { name: "GitHub", url: "https://www.githubstatus.com/api/v2/summary.json", type: "statuspage" },
  { name: "OpenAI", url: "https://status.openai.com/api/v2/summary.json", type: "statuspage" },
  { name: "Reddit", url: "https://www.redditstatus.com/api/v2/summary.json", type: "statuspage" },
  { name: "Twitch", url: "https://status.twitch.tv/api/v2/summary.json", type: "statuspage" },

  // AWS (custom format)
  { name: "Amazon Web Services (AWS)", url: "https://status.aws.amazon.com/data.json", type: "aws" },

  // Google Cloud (custom format)
  { name: "Google Cloud", url: "https://status.cloud.google.com/incidents.json", type: "gcloud" }
];

/*
====================================
STATUS MAPPING
====================================
*/

function mapStatus(indicator) {
  switch (indicator) {
    case "none":
      return "Operational";
    case "minor":
      return "Minor Issues";
    case "major":
    case "critical":
      return "Major Outage";
    default:
      return "Operational";
  }
}

/*
====================================
SERVICE CHECK LOGIC
====================================
*/

async function checkService(service) {
  try {
    const response = await axios.get(service.url, { timeout: 8000 });

    // Atlassian Statuspage services
    if (service.type === "statuspage") {
      const indicator = response.data.status.indicator;
      return {
        name: service.name,
        status: mapStatus(indicator)
      };
    }

    // AWS
    if (service.type === "aws") {
      const data = response.data;
      let hasIssue = false;

      for (const region in data) {
        if (!data[region].services) continue;

        for (const serviceName in data[region].services) {
          const status = data[region].services[serviceName];
          if (status !== "available") {
            hasIssue = true;
          }
        }
      }

      return {
        name: service.name,
        status: hasIssue ? "Minor Issues" : "Operational"
      };
    }

    // Google Cloud
    if (service.type === "gcloud") {
      const incidents = response.data;
      return {
        name: service.name,
        status: incidents.length > 0 ? "Minor Issues" : "Operational"
      };
    }

    return { name: service.name, status: "Operational" };

  } catch (error) {
    return {
      name: service.name,
      status: "Error"
    };
  }
}

/*
====================================
API ROUTE
====================================
*/

app.get("/api/status", async (req, res) => {
  const results = await Promise.all(services.map(checkService));
  res.json(results);
});

/*
====================================
KEEP ALIVE (ANTI SLEEP)
====================================
*/

setInterval(async () => {
  try {
    await Promise.all(services.map(checkService));
    console.log("Heartbeat check completed.");
  } catch (err) {
    console.log("Heartbeat error:", err.message);
  }
}, 5 * 60 * 1000); // every 5 minutes

/*
====================================
START SERVER
====================================
*/

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
