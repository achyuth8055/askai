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
            res.write(`data: ${JSON.stringify({ error: `API Error: ${response.status}` })}\n\n`);
            res.end();
            return;
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json") && !contentType.includes("text/event-stream")) {
            const errorText = await response.text();
            console.error("❌ Unexpected Response Type:", contentType, errorText);
            res.write(`data: ${JSON.stringify({ error: "Unexpected response format from AI" })}\n\n`);
            res.end();
            return;
        }

        if (!response.body) {
            console.error("❌ No response body from AI model.");
            res.write(`data: ${JSON.stringify({ error: "Empty response from AI" })}\n\n`);
            res.end();
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedResponse = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunkText = decoder.decode(value, { stream: true }).trim();
            accumulatedResponse += chunkText;

            if (res.writableEnded) {
                console.warn("⚠️ Client disconnected, stopping stream.");
                return;
            }

            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
            console.log("🔹 Streaming chunk:", chunkText);
        }

        res.write("data: [DONE]\n\n");
        res.end();
    } catch (error) {
        console.error("❌ Error fetching AI response:", error);
        if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ error: error.message || "An error occurred" })}\n\n`);
            res.end();
        }
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 AI Server running on port ${port}`));
