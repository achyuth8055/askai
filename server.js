const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch"); // ✅ Ensure you use CommonJS `require()`
require("dotenv").config();

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.set("view engine", "ejs");
app.set("views", "views");
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/stream", async (req, res) => {
    const { prompt } = req.query;
    console.log(`🔹 Received request: "${prompt}"`);

    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    try {
        console.log("🔹 Fetching AI response...");
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const response = await fetch(`${process.env.OLLAMA_HOST}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama2", prompt, stream: true }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Ollama API Error: ${response.status} - ${errorText}`);
            return res.status(response.status).json({ error: errorText });
        }

        const data = await response.text(); // ✅ Correctly handle streaming data
        const lines = data.split("\n").filter(line => line.trim() !== "");

        for (const line of lines) {
            try {
                const parsedJson = JSON.parse(line);
                if (parsedJson.response) {
                    console.log("🔹 Streaming response:", parsedJson.response);
                    res.write(`data: ${JSON.stringify({ text: parsedJson.response })}\n\n`);
                }
            } catch (jsonError) {
                console.error("❌ JSON Parse Error:", jsonError, "Data received:", line);
            }
        }

        res.write("data: [DONE]\n\n");
        res.end();

    } catch (error) {
        console.error("❌ Error fetching AI response:", error);
        res.status(500).json({ error: error.message || "An error occurred" });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 AI Server running on port ${port}`));
