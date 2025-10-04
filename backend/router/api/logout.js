const express = require("express");
const router = express.Router();
const logoutController = require("../../controllers/logoutController"); // adjust path

// Session-based logout
router.post("/", logoutController);

// JWT-based logout (optional)
router.post("/jwt", (req, res) => {
  // Invalidate token if needed
  return res.json({ message: "Logged out successfully" });
});

module.exports = router;
// this is just for testing
