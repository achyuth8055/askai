const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { TextDecoder } = require("util");

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

// ✅ FIX: Stream AI Response Properly
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

        const response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama2", prompt }),
        });

        if (!response.body) {
            throw new Error("No response body from AI model.");
        }

        const decoder = new TextDecoder();
        const reader = response.body;

        for await (const chunk of reader) {
            try {
                const parsedJson = JSON.parse(decoder.decode(chunk, { stream: true }));
                if (parsedJson.response) {
                    let formattedText = parsedJson.response
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/```([\s\S]*?)```/g, `<pre><code>$1</code></pre>`);

                    console.log("🔹 Streaming response:", formattedText);
                    res.write(`data: ${JSON.stringify({ text: formattedText })}\n\n`);
                }
            } catch (err) {
                console.error("❌ JSON parse error:", err);
            }
        }

        res.write("data: [DONE]\n\n");
        res.end();
    } catch (error) {
        console.error("❌ Error fetching AI response:", error);
        res.write("data: [ERROR]\n\n");
        res.end();
    }
});

app.listen(3000, () => console.log("🚀 AI Server running on port 3000"));
