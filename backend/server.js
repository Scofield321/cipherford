const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./config/db");

dotenv.config();
const app = express();
const server = http.createServer(app);

// -------------------------
// Socket.io setup
// -------------------------
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust if needed
    methods: ["GET", "POST"],
  },
});

// -------------------------
// PORT check
// -------------------------
const PORT = process.env.PORT || 5000;
if (!PORT) {
  console.error("❌ No PORT environment variable found!");
  process.exit(1);
}

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

// ✅ Use path.join with __dirname to point to actual folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// -------------------------
// Download certificate
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
    if (!file_url) return res.status(404).json({ msg: "No file associated" });

    res.setHeader("Content-Disposition", `attachment; filename="${title}.pdf"`);
    res.redirect(file_url);
  } catch (err) {
    console.error("Download certificate error:", err.message);
    res.status(500).json({ msg: err.message });
  }
});

// -------------------------
// Download badge
// -------------------------
app.get("/api/badges/:id/download", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      "SELECT file_url, title FROM badges WHERE id=$1",
      [id]
    );
    if (!rows.length) return res.status(404).json({ msg: "Badge not found" });

    const { file_url, title } = rows[0];
    if (!file_url) return res.status(404).json({ msg: "No file associated" });

    res.setHeader("Content-Disposition", `attachment; filename="${title}.png"`);
    res.redirect(file_url);
  } catch (err) {
    console.error("Download badge error:", err.message);
    res.status(500).json({ msg: err.message });
  }
});

// -------------------------
// Download resource
// -------------------------
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
    if (!file_url) return res.status(404).json({ msg: "No file associated" });

    // Use original file extension if stored
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
// Socket.io logic
// -------------------------
io.on("connection", (socket) => {
  console.log("👤 A user connected");

  socket.on("join_student", (studentId) => {
    socket.join(`student`);
    console.log(`📡 User joined room student`);
  });

  socket.on("disconnect", () => {
    console.log("👋 A user disconnected");
  });
});

// Make io globally available
app.set("io", io);

// -------------------------
// Start the server
// -------------------------
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
