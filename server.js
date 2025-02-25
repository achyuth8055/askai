const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { TextDecoder } = require("util");
require('dotenv').config();

const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

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

        // ✅ FIXED: Use OLLAMA_HOST instead of OLLAMA_IP
        const ollamaHost = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

        const response = await fetch(`${ollamaHost}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama2", prompt }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API Error: ${response.status} - ${errorText}`);
        }

        if (!response.body) {
            throw new Error("No response body from AI model.");
        }

        const decoder = new TextDecoder();
        const reader = response.body.getReader();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            try {
                const chunk = decoder.decode(value, { stream: true });
                const parsedJson = JSON.parse(chunk);

                if (parsedJson.response) {
                    let formattedText = parsedJson.response
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/```([\s\S]*?)```/g, `<pre><code>$1</code></pre>`);

                    console.log("🔹 Streaming response:", formattedText);
                    res.write(`data: ${JSON.stringify({ text: formattedText })}\n\n`);
                }
            } catch (jsonError) {
                console.error("❌ JSON parse error:", jsonError);
                res.write(`data: ${JSON.stringify({ text: "[Error processing response]" })}\n\n`);
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
