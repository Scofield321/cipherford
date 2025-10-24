const dotenv = require("dotenv");
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env";
dotenv.config({ path: envFile });

const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./config/db");

const app = express();
const server = http.createServer(app);

const { finalizeMatchSocket } = require("./controllers/gameMatchController");

// -------------------------
// Socket.io setup
// -------------------------
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"],
  },
});

// -------------------------
// Middleware
// -------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
  "https://cipherford.vercel.app",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed from this origin"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// -------------------------
// Routes (certificate, badge, resource downloads)
// -------------------------
app.get("/api/certificates/:id/download", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      "SELECT file_url, title FROM certificates WHERE id=$1",
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ msg: "Certificate not found" });
    const { file_url, title } = rows[0];
    res.setHeader("Content-Disposition", `attachment; filename="${title}.pdf"`);
    res.redirect(file_url);
  } catch (err) {
    console.error("Download certificate error:", err.message);
    res.status(500).json({ msg: err.message });
  }
});

app.get("/api/badges/:id/download", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      "SELECT file_url, title FROM badges WHERE id=$1",
      [id]
    );
    if (!rows.length) return res.status(404).json({ msg: "Badge not found" });
    const { file_url, title } = rows[0];
    res.setHeader("Content-Disposition", `attachment; filename="${title}.png"`);
    res.redirect(file_url);
  } catch (err) {
    console.error("Download badge error:", err.message);
    res.status(500).json({ msg: err.message });
  }
});

app.get("/api/resources/:id/download", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      "SELECT file_url, title FROM resources WHERE id=$1",
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ msg: "Resource not found" });
    const { file_url, title } = rows[0];
    const ext = path.extname(file_url) || ".pdf";
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${title}${ext}"`
    );
    res.redirect(file_url);
  } catch (err) {
    console.error("Download resource error:", err.message);
    res.status(500).json({ msg: err.message });
  }
});

// -------------------------
// Root test route
// -------------------------
app.get("/", (req, res) => {
  res.json({ message: "Cipherford backend is running!" });
});

// -------------------------
// API routes
// -------------------------
app.use("/api", require("./router/api"));

app.post("/api/test-json", (req, res) => {
  console.log("✅ Test POST received:", req.body);
  res.json({ message: "POST working!", body: req.body });
});

// -------------------------
// 404 Handler
// -------------------------
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// -------------------------
// Global error handler
// -------------------------
app.use((err, req, res, next) => {
  console.error("Global Error:", err.message);
  if (!res.headersSent) {
    res.status(500).json({ msg: err.message || "Server error" });
  }
});

// -------------------------
// Socket.io logic (Real-time Quiz Battle)
// -------------------------
io.on("connection", (socket) => {
  console.log("👤 A user connected:", socket.id);

  // ✅ Player joins a specific match room
  socket.on("join_room", ({ room_code, user_id }) => {
    socket.join(room_code);
    console.log(`🟢 User ${user_id} joined room ${room_code}`);
    const roomInfo = io.sockets.adapter.rooms.get(room_code);
    console.log(
      `Room ${room_code} now has ${roomInfo ? roomInfo.size : 0} players.`
    );
  });

  // ✅ Notify player 1 when player 2 joins
  socket.on("player_joined", (data) => {
    const { room_code, playerName } = data;
    console.log(`📢 Player joined room ${room_code}: ${playerName}`);
    socket.to(room_code).emit("player_joined", data);
  });

  // ✅ Handle answer submissions
  socket.on(
    "submit_answer",
    async ({ room_code, match_quiz_id, player, answer }) => {
      try {
        // Save answer to DB (replace with actual score logic)
        await pool.query(
          `UPDATE game_match_quizzes 
           SET ${player === 1 ? "player1_score" : "player2_score"} = $1 
           WHERE id = $2`,
          [answer, match_quiz_id]
        );

        // Broadcast update to both players
        io.to(room_code).emit("answer_submitted", {
          match_quiz_id,
          player,
          answer,
        });
      } catch (err) {
        console.error("❌ Error submitting answer:", err.message);
      }
    }
  );

  // ✅ Finalize match and notify both players
  socket.on("finalize_match", async ({ room_code }) => {
    try {
      const result = await finalizeMatchSocket(room_code);
      if (result) io.to(room_code).emit("match_finalized", result);
    } catch (err) {
      console.error("❌ Error finalizing match:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("👋 A user disconnected:", socket.id);
  });
});

// Make io globally available
app.set("io", io);

// -------------------------
// Start the server
// -------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
// testiing
