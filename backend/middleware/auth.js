// middleware/auth.js
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// Generic JWT authentication middleware
async function auth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "No token, access denied" });
  }

  const token = authHeader.split(" ")[1];
  // this is just for testing
  try {
    // Verify token,
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    );

    // Optional: fetch full user info from DB
    const userQuery = await pool.query("SELECT * FROM users WHERE id=$1", [
      decoded.id,
    ]);
    const user = userQuery.rows[0];

    if (!user) return res.status(401).json({ msg: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return res.status(401).json({ msg: "Token is not valid" });
  }
}

// Admin-only middleware
function adminAuth(req, res, next) {
  // First, run the auth middleware
  auth(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Admin access only" });
    }
    next();
  });
}

module.exports = { auth, adminAuth };
