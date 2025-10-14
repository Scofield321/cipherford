const db = require("../config/db");
const { addXpToUser } = require("./xpController");

// Helper function to calculate level/progress
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

  const filledBlocks = Math.round((progressPercent / 100) * 10);
  const emptyBlocks = 10 - filledBlocks;
  const progressBar = "█".repeat(filledBlocks) + "-".repeat(emptyBlocks);

  return { level, progress: Math.round(progressPercent), progressBar };
};

// Submit a new answer
const submitAnswer = async (req, res) => {
  const { post_id, answer, user_id } = req.body;

  if (!post_id || !answer || !user_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Fetch user's first name
    const userResult = await db.query(
      `SELECT first_name FROM users WHERE id = $1`,
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const username = userResult.rows[0].first_name;

    // Insert answer
    await db.query(
      `INSERT INTO community_answers (post_id, user_id, username, answer)
       VALUES ($1, $2, $3, $4)`,
      [post_id, user_id, username, answer]
    );

    // Award XP for answering
    const xpToAdd = 10; // XP for answering a post
    await addXpToUser(user_id, xpToAdd);

    // Fetch updated XP
    const xpRes = await db.query("SELECT xp FROM user_xp WHERE user_id=$1", [
      user_id,
    ]);
    const updatedXP = xpRes.rows[0].xp;

    // Calculate level/progress
    const levelData = calculateLevelAndProgress(updatedXP);

    res.status(201).json({
      message: "Answer submitted and XP updated!",
      xp: updatedXP,
      ...levelData,
    });
  } catch (err) {
    console.error("Submit Answer Error:", err.message);
    res.status(500).json({ error: "Server error submitting answer" });
  }
};

// Get answers for a post
const getAnswersForPost = async (req, res) => {
  const { postId } = req.params;

  try {
    const result = await db.query(
      `SELECT * FROM community_answers
       WHERE post_id = $1
       ORDER BY created_at DESC`,
      [postId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Fetch Answers Error:", err.message);
    res.status(500).json({ error: "Server error fetching answers" });
  }
};

module.exports = { submitAnswer, getAnswersForPost };
