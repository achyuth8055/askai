const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
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
            console.error("❌ Ollama API Error:", errorText);
            throw new Error(`Ollama API Error: ${response.status}`);
        }

        if (!response.body) {
            throw new Error("No response body from AI model.");
        }

        const reader = response.body.pipe(new require("stream").PassThrough());
        const decoder = new TextDecoder();

        reader.on("data", (chunk) => {
            try {
                const dataString = decoder.decode(chunk, { stream: true }).trim();
                const lines = dataString.split("\n").filter(line => line.trim() !== "");

                lines.forEach(line => {
                    if (line.startsWith("data:")) {
                        line = line.replace("data:", "").trim();  // Remove `data:` prefix
                    }
                    const parsedJson = JSON.parse(line);
                    if (parsedJson.response) {
                        console.log("🔹 Streaming response:", parsedJson.response);
                        res.write(`data: ${JSON.stringify({ text: parsedJson.response })}\n\n`);
                    }
                });
            } catch (jsonError) {
                console.error("❌ JSON Parse Error:", jsonError);
            }
        });

        reader.on("end", () => {
            res.write("data: [DONE]\n\n");
            res.end();
        });

    } catch (error) {
        console.error("❌ Error fetching AI response:", error);
        res.status(500).json({ error: error.message || "An error occurred" });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 AI Server running on port ${port}`));
