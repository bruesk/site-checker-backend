const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

const services = [
  { name: "Discord", type: "statuspage", url: "https://discordstatus.com/api/v2/summary.json" },
  { name: "Cloudflare", type: "statuspage", url: "https://www.cloudflarestatus.com/api/v2/summary.json" },
  { name: "GitHub", type: "statuspage", url: "https://www.githubstatus.com/api/v2/summary.json" },
  { name: "OpenAI", type: "statuspage", url: "https://status.openai.com/api/v2/summary.json" },
  { name: "Reddit", type: "statuspage", url: "https://www.redditstatus.com/api/v2/summary.json" },
  { name: "Twitch", type: "statuspage", url: "https://status.twitch.tv/api/v2/summary.json" },
  { name: "Amazon Web Services (AWS)", type: "aws", url: "https://status.aws.amazon.com/data.json" },
  { name: "Google Cloud", type: "gcloud", url: "https://status.cloud.google.com/incidents.json" }
];

function mapStatus(indicator) {
  if (indicator === "none") return "Operational";
  if (indicator === "minor") return "Minor Issues";
  if (indicator === "major" || indicator === "critical") return "Major Outage";
  return "Operational";
}

async function checkService(service) {
  try {
    const response = await axios.get(service.url, {
      timeout: 8000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json"
      }
    });

    if (service.type === "statuspage") {
      const indicator = response.data.status?.indicator || "none";
      return { name: service.name, status: mapStatus(indicator) };
    }

    if (service.type === "aws") {
      const data = response.data;
      let hasIssue = false;

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
        name: service.name,
        status: hasIssue ? "Minor Issues" : "Operational"
      };
    }

    if (service.type === "gcloud") {
      const incidents = response.data;
      return {
        name: service.name,
        status: incidents.length > 0 ? "Minor Issues" : "Operational"
      };
    }

    return { name: service.name, status: "Operational" };

  } catch (error) {
    return { name: service.name, status: "Error" };
  }
}

app.get("/api/status", async (req, res) => {
  const results = await Promise.all(services.map(checkService));
  res.json(results);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
