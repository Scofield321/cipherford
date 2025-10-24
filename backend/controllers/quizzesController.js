const db = require("../config/db");
const { addXpToUser } = require("./xpController");
// Get all quizzes
const getAllQuizzes = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM community_quizzes ORDER BY created_at DESC"
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching quizzes:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Get a quiz by ID
const getQuizById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "SELECT * FROM community_quizzes WHERE id=$1",
      [id]
    );
    if (!result.rows.length)
      return res.status(404).json({ error: "Quiz not found" });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching quiz:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Create a new quiz
const createQuiz = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admins can create quizzes" });
  }

  const { question, options, correct_answer, tags } = req.body;
  if (!question || !options || !correct_answer) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await db.query(
      `INSERT INTO community_quizzes (question, options, correct_answer, tags)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [question, options, correct_answer, tags || []]
    );
    res
      .status(201)
      .json({ message: "Quiz created successfully", quiz: result.rows[0] });
  } catch (err) {
    console.error("Error creating quiz:", err.message);
    res.status(500).json({ error: "Server error creating quiz" });
  }
};

// Update a quiz
const updateQuiz = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admins can update quizzes" });
  }

  const { id } = req.params;
  const { question, options, correct_answer, tags } = req.body;

  try {
    const result = await db.query(
      `UPDATE community_quizzes
       SET question = COALESCE($1, question),
           options = COALESCE($2, options),
           correct_answer = COALESCE($3, correct_answer),
           tags = COALESCE($4, tags)
       WHERE id = $5
       RETURNING *`,
      [question, options, correct_answer, tags, id]
    );

    if (!result.rows.length)
      return res.status(404).json({ error: "Quiz not found" });

    res
      .status(200)
      .json({ message: "Quiz updated successfully", quiz: result.rows[0] });
  } catch (err) {
    console.error("Error updating quiz:", err.message);
    res.status(500).json({ error: "Server error updating quiz" });
  }
};

// Delete a quiz
const deleteQuiz = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admins can delete quizzes" });
  }

  const { id } = req.params;

  try {
    const result = await db.query(
      "DELETE FROM community_quizzes WHERE id=$1 RETURNING *",
      [id]
    );

    if (!result.rows.length)
      return res.status(404).json({ error: "Quiz not found" });

    res
      .status(200)
      .json({ message: "Quiz deleted successfully", quiz: result.rows[0] });
  } catch (err) {
    console.error("Error deleting quiz:", err.message);
    res.status(500).json({ error: "Server error deleting quiz" });
  }
};
// Helper function to calculate level/progress (same as leaderboard)
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

// Submit a quiz answer
const submitQuizAnswer = async (req, res) => {
  const { quizId, userId, selectedOption } = req.body;

  if (!quizId || !userId || selectedOption === undefined)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    // Fetch the correct answer
    const quizRes = await db.query(
      "SELECT correct_answer FROM community_quizzes WHERE id=$1",
      [quizId]
    );

    if (!quizRes.rows.length)
      return res.status(404).json({ error: "Quiz not found" });

    const correctAnswer = quizRes.rows[0].correct_answer;
    const isCorrect = correctAnswer === selectedOption;

    let updatedXP = 0;
    let levelData = null;

    // Award XP if correct
    if (isCorrect) {
      await addXpToUser(userId, 10);

      // Fetch updated XP
      const xpRes = await db.query("SELECT xp FROM user_xp WHERE user_id=$1", [
        userId,
      ]);
      updatedXP = xpRes.rows[0].xp;

      // Calculate level/progress
      levelData = calculateLevelAndProgress(updatedXP);
    }

    res.status(200).json({
      correct: isCorrect,
      message: isCorrect ? "Correct! XP awarded." : "Incorrect answer.",
      xp: updatedXP,
      ...(!isCorrect ? { correctAnswer } : {}), // send correctAnswer only if wrong
      ...levelData,
    });
  } catch (err) {
    console.error("Submit Quiz Error:", err.message);
    res.status(500).json({ error: "Server error submitting quiz answer" });
  }
};

module.exports = {
  getAllQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  submitQuizAnswer,
};
