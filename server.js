const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", "views");

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const PORT = process.env.PORT || 3000;

// ✅ **Render Homepage**
app.get("/", (req, res) => {
    res.render("index");
});

// ✅ **AI Response Streaming Endpoint**
app.get("/stream", async (req, res) => {
    const { prompt } = req.query;
    console.log(`🔹 Received request: "${prompt}"`);

    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    try {
        console.log("🔹 Fetching AI response...");

        // Set headers for Server-Sent Events (SSE)
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        // Fetch AI response from Ollama API
        const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama2", prompt, stream: true }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Ollama API Error:", errorText);
            throw new Error(`Ollama API Error: ${response.status} - ${errorText}`);
        }

        if (!response.body) {
            throw new Error("No response body from AI model.");
        }

        // Streaming AI response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedResponse = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunkText = decoder.decode(value, { stream: true }).trim();
            accumulatedResponse += chunkText;

            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
            console.log("🔹 Streaming chunk:", chunkText);
        }

        res.write("data: [DONE]\n\n");
        res.end();
    } catch (error) {
        console.error("❌ Error fetching AI response:", error);
        res.write("data: [ERROR]\n\n");
        res.end();
    }
});

// ✅ **Error Handling**
process.on("uncaughtException", (err) => {
    console.error("🚨 Unhandled Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("🚨 Unhandled Rejection:", reason);
});

// ✅ **Start Server**
app.listen(PORT, () => console.log(`🚀 AI Server running on port ${PORT}`));
