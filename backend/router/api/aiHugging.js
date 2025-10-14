const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

const HF_API_TOKEN = process.env.HF_API_TOKEN;
const MODEL = "distilbert/distilgpt2"; // Deployed model with Inference API support

router.post("/hugging", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res
        .status(response.status)
        .json({ error: text || "Inference API error" });
    }

    if (response.status !== 200) {
      return res
        .status(response.status)
        .json({ error: data.error || "Inference API error" });
    }

    const reply = Array.isArray(data)
      ? data[0].generated_text
      : JSON.stringify(data);
    res.json({ reply });
  } catch (error) {
    console.error("Hugging Face AI error:", error);
    res.status(500).json({ error: "Failed to fetch AI response" });
  }
});

module.exports = router;
