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

// Set EJS view engine
app.set("view engine", "ejs");
app.set("views", "views");
app.use(express.static("public"));

// Home route
app.get("/", (req, res) => {
    res.render("index");
});

// AI Streaming Route
app.get("/stream", async (req, res) => {
    const { prompt } = req.query;
    console.log(`🔹 Received request: "${prompt}"`);

    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    try {
        console.log("🔹 Fetching AI response...");

        // Set headers for streaming response
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        // Make API request to Ollama
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

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process each line of the streamed JSON
            const lines = buffer.split("\n").filter(line => line.trim() !== "");
            buffer = ""; // Reset buffer after processing

            lines.forEach(line => {
                try {
                    const parsedJson = JSON.parse(line);
                    if (parsedJson.response) {
                        console.log("🔹 Streaming response:", parsedJson.response);
                        res.write(`data: ${JSON.stringify({ text: parsedJson.response })}\n\n`);
                    }
                } catch (jsonError) {
                    console.error("❌ JSON Parse Error:", jsonError);
                }
            });
        }

        res.write("data: [DONE]\n\n");
        res.end();

    } catch (error) {
        console.error("❌ Error fetching AI response:", error);
        res.write(`data: ${JSON.stringify({ error: error.message || "An error occurred" })}\n\n`);
        res.end();
    }
});

// Start Server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 AI Server running on port ${port}`));
