const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/check", async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: "URL is required" });
    }

    let formattedUrl = url;
    if (!formattedUrl.startsWith("http")) {
        formattedUrl = "https://" + formattedUrl;
    }

    const start = Date.now();

    try {
        const response = await axios.get(formattedUrl, {
            timeout: 5000,
            validateStatus: () => true
        });

        const responseTime = Date.now() - start;

        res.json({
            status: response.status >= 200 && response.status < 400 ? "UP" : "DOWN",
            code: response.status,
            responseTime
        });

    } catch (error) {
        res.json({
            status: "DOWN",
            error: error.message
        });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
