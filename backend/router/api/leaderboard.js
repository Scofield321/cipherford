const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const {
  getLeaderboard,
  getUserStats,
} = require("../../controllers/leaderboardController");

router.get("/", auth, getLeaderboard);
router.get("/:userId", auth, getUserStats);

module.exports = router;
