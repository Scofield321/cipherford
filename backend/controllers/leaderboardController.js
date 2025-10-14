const db = require("../config/db");

// Helper function to calculate dynamic level and progress
const calculateLevelAndProgress = (xp) => {
  let level = 1;
  let xpForNextLevel = 50;

  while (xp >= xpForNextLevel) {
    level++;
    xpForNextLevel = Math.floor(50 * Math.pow(1.5, level - 1));
  }

  const prevLevelXp =
    level === 1 ? 0 : Math.floor(50 * Math.pow(1.5, level - 2));
  const progressPercent = Math.min(
    100,
    ((xp - prevLevelXp) / (xpForNextLevel - prevLevelXp)) * 100
  );

  // Progress bar of length 10
  const filledBlocks = Math.round((progressPercent / 100) * 10);
  const emptyBlocks = 10 - filledBlocks;
  const progressBar = "█".repeat(filledBlocks) + "-".repeat(emptyBlocks);

  return { level, progress: Math.round(progressPercent), progressBar };
};

// Get top N users by XP
const getLeaderboard = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const result = await db.query(
      `SELECT
         ROW_NUMBER() OVER (ORDER BY COALESCE(ux.xp, 0) DESC) AS rank,
         u.id AS user_id,
         u.first_name,
         u.last_name,
         COALESCE(ux.xp, 0) AS xp
       FROM users u
       LEFT JOIN user_xp ux ON u.id = ux.user_id
       ORDER BY xp DESC
       LIMIT $1`,
      [limit]
    );

    const leaderboard = result.rows.map((user) => {
      const { level, progress, progressBar } = calculateLevelAndProgress(
        user.xp
      );
      return { ...user, level, progress, progressBar };
    });

    res.status(200).json(leaderboard);
  } catch (err) {
    console.error("Error fetching leaderboard:", err.message);
    res.status(500).json({ error: "Server error fetching leaderboard" });
  }
};

// Get a single user's XP and level/progress
const getUserStats = async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await db.query(
      `SELECT u.first_name, u.last_name, COALESCE(ux.xp, 0) AS xp
       FROM users u
       LEFT JOIN user_xp ux ON u.id = ux.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found in leaderboard" });
    }

    const user = result.rows[0];
    const { level, progress, progressBar } = calculateLevelAndProgress(user.xp);
    user.level = level;
    user.progress = progress;
    user.progressBar = progressBar;

    res.status(200).json(user);
  } catch (err) {
    console.error("Error fetching user stats:", err.message);
    res.status(500).json({ error: "Server error fetching user stats" });
  }
};

module.exports = { getLeaderboard, getUserStats };
