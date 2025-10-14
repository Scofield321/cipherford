// const { OpenAI } = require("openai");
// const fetch = require("node-fetch");
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   fetch,
// });

// const chatWithAI = async (req, res) => {
//   const { prompt } = req.body;
//   if (!prompt) return res.status(400).json({ error: "Prompt is required" });

//   try {
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o", // or "gpt-3.5-turbo"
//       messages: [
//         {
//           role: "system",
//           content: "You are a helpful assistant for coding students.",
//         },
//         { role: "user", content: prompt },
//       ],
//     });

//     const reply = completion.choices[0].message.content.trim();
//     res.json({ reply });
//   } catch (error) {
//     console.error("AI error:", error);
//     res.status(500).json({ error: "Failed to fetch response from AI" });
//   }
// };

// module.exports = { chatWithAI };
