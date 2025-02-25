const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config();

const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434"; // ✅ Ensure correct Ollama host

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
        console.log(`🔹 Connecting to Ollama at: ${OLLAMA_HOST}`);

        const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama2", prompt }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Ollama API Error: ${response.status} - ${errorText}`);
            return res.status(response.status).json({ error: errorText });
        }

        const responseData = await response.json();
        if (!responseData.response) {
            throw new Error("No valid response from AI model.");
        }

        console.log("🔹 AI Response:", responseData.response);
        res.json({ text: responseData.response });

    } catch (error) {
        console.error("❌ Error fetching AI response:", error);
        res.status(503).json({ error: "Service Unavailable. Check Ollama API connection." });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 AI Server running on port ${port}`));
