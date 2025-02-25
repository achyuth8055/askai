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

        const response = await fetch(`http://${process.env.OLLAMA_IP}:11434/api/generate`, { // Use environment variable!
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama2", prompt }),
        });

        if (!response.ok) {
            const errorText = await response.text(); // Get error text
            throw new Error(`Ollama API Error: ${response.status} - ${errorText}`); // Throw error with details
        }


        if (!response.body) {
            throw new Error("No response body from AI model.");
        }

        const decoder = new TextDecoder();
        const reader = response.body.getReader(); // Get the reader

        while (true) {
            const { done, value } = await reader.read(); // Read a chunk
            if (done) break; // Exit loop if done

            try {
                const chunk = decoder.decode(value, { stream: true }); // Decode the chunk
                const parsedJson = JSON.parse(chunk); // Parse JSON

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
                // Handle JSON parse errors gracefully, maybe send a special message to the client
                res.write(`data: ${JSON.stringify({ text: "[Error processing response]" })}\n\n`);
            }
        }
        res.write("data: [DONE]\n\n");
        res.end();
    } catch (error) {
        console.error("❌ Error fetching AI response:", error);
        res.status(500).json({ error: error.message || "An error occurred" }); // JSON error response
    }
});



const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 AI Server running on port ${port}`));