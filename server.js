// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config();

const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

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
        const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama2", prompt }), // Or your model name
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Ollama API Error: ${response.status} - ${errorText}`);
            return res.status(response.status).json({ error: errorText }); // Send JSON error
        }

        const responseData = await response.json();
        console.log("🔹 AI Response:", responseData); // Log the full response

        if (!responseData.response) { // Check if 'response' field exists
            throw new Error("No valid response from AI model.");
        }

        res.json({ text: responseData.response });

    } catch (error) {
        console.error("❌ Error fetching AI response:", error);
        res.status(500).json({ error: error.message || "An error occurred" }); // Send JSON error
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 AI Server running on port ${port}`));

