const db = require("../config/db");
const { addXpToUser } = require("./xpController");

/**
 * Helper function to calculate level and progress
 */
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

/**
 * =============================
 * GET: /api/student/community/posts
 * Fetch Q&A posts (questions + challenges)
 * =============================
 */
const getCommunityPosts = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, u.first_name, u.last_name
       FROM community_posts p
       LEFT JOIN users u ON p.username = u.last_name
       WHERE p.type IN ('question', 'challenge')
       ORDER BY p.created_at DESC`
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching community posts:", err.message);
    res.status(500).json({ error: "Failed to fetch community posts" });
  }
};

/**
 * =============================
 * POST: /api/student/community/posts
 * Create a new Q&A or challenge post
 * =============================
 */
const createStudentPost = async (req, res) => {
  const { title, body, type } = req.body;
  const user_id = req.user.id;

  if (!title || !body || !type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const userRes = await db.query(
      "SELECT first_name, last_name FROM users WHERE id = $1",
      [user_id]
    );
    if (!userRes.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const username = `${userRes.rows[0].first_name} ${userRes.rows[0].last_name}`;

    const result = await db.query(
      `INSERT INTO community_posts (title, body, type, username)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, body, type, username]
    );

    await addXpToUser(user_id, 5); // XP for creating a post
    res
      .status(201)
      .json({ message: "Post created successfully!", post: result.rows[0] });
  } catch (err) {
    console.error("Error creating post:", err.message);
    res.status(500).json({ error: "Failed to create post" });
  }
};

/**
 * =============================
 * POST: /api/student/community/answers
 * Submit an answer to Q&A or challenge
 * =============================
 */
const submitAnswer = async (req, res) => {
  const { post_id, answer } = req.body;
  const user_id = req.user.id;

  if (!post_id || !answer)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    const userRes = await db.query(
      "SELECT first_name FROM users WHERE id = $1",
      [user_id]
    );
    if (!userRes.rows.length)
      return res.status(404).json({ error: "User not found" });

    const username = userRes.rows[0].first_name;

    await db.query(
      `INSERT INTO community_answers (post_id, user_id, username, answer)
       VALUES ($1, $2, $3, $4)`,
      [post_id, user_id, username, answer]
    );

    const xpToAdd = 10;
    await addXpToUser(user_id, xpToAdd);

    const xpRes = await db.query("SELECT xp FROM user_xp WHERE user_id=$1", [
      user_id,
    ]);
    const updatedXP = xpRes.rows[0].xp;
    const levelData = calculateLevelAndProgress(updatedXP);

    res.status(201).json({
      message: "Answer submitted successfully!",
      xp: updatedXP,
      ...levelData,
    });
  } catch (err) {
    console.error("Error submitting answer:", err.message);
    res.status(500).json({ error: "Failed to submit answer" });
  }
};

/**
 * =============================
 * GET: /api/student/community/posts/:postId/answers
 * Fetch all answers for a post
 * =============================
 */
const getAnswersForPost = async (req, res) => {
  const { postId } = req.params;

  try {
    const result = await db.query(
      `SELECT a.*, u.first_name, u.last_name
       FROM community_answers a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.post_id = $1
       ORDER BY a.created_at DESC`,
      [postId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching answers:", err.message);
    res.status(500).json({ error: "Failed to fetch answers" });
  }
};

/**
 * =============================
 * GET: /api/student/community/quizzes
 * =============================
 * Fetch all quizzes/questions with their options
 */
const getQuizzes = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, question, options, tags
       FROM community_quizzes
       ORDER BY created_at DESC`
    );

    // Map options from Postgres array to JS array
    const quizzes = result.rows.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options, // Already an array from Postgres
      tags: q.tags,
    }));

    res.status(200).json(quizzes);
  } catch (err) {
    console.error("Error fetching quizzes:", err.message);
    res.status(500).json({ error: "Failed to fetch quizzes" });
  }
};

/**
 * =============================
 * POST: /api/student/community/quizzes/submit
 * =============================
 * Submit answer for a quiz question (within a quiz set)
 */
const submitQuiz = async (req, res) => {
  const { quizId, selectedOption } = req.body;
  const userId = req.user.id;

  if (!quizId || selectedOption === undefined)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    // Fetch quiz details including set_id
    const quizRes = await db.query(
      "SELECT id, correct_answer, set_id FROM community_quizzes WHERE id = $1",
      [quizId]
    );

    if (!quizRes.rows.length)
      return res.status(404).json({ error: "Quiz not found" });

    const quiz = quizRes.rows[0];
    const correctAnswer = quiz.correct_answer;
    const setId = quiz.set_id;
    const isCorrect = correctAnswer === selectedOption;

    // Check if already attempted
    const attemptCheck = await db.query(
      `SELECT * FROM student_quiz_attempts 
       WHERE user_id = $1 AND quiz_id = $2`,
      [userId, quizId]
    );

    if (attemptCheck.rows.length > 0) {
      return res.status(400).json({
        error: "You already attempted this quiz.",
        alreadyAttempted: true,
      });
    }

    // Record this quiz attempt
    await db.query(
      `INSERT INTO student_quiz_attempts 
       (user_id, quiz_id, set_id, selected_answer, is_correct, xp_earned, completed)
       VALUES ($1, $2, $3, $4, $5, 0, FALSE)`,
      [userId, quizId, setId, selectedOption, isCorrect]
    );

    // Check if the student completed the full set
    const setQuizzes = await db.query(
      `SELECT id FROM community_quizzes WHERE set_id = $1`,
      [setId]
    );

    const totalQuizzes = setQuizzes.rows.length;

    const attempts = await db.query(
      `SELECT COUNT(*) AS count FROM student_quiz_attempts 
       WHERE user_id = $1 AND set_id = $2`,
      [userId, setId]
    );

    const completedCount = parseInt(attempts.rows[0].count);

    // Only give XP after the entire set is done
    let message;
    if (completedCount === totalQuizzes) {
      const correctAnswers = await db.query(
        `SELECT COUNT(*) AS correct_count FROM student_quiz_attempts
         WHERE user_id = $1 AND set_id = $2 AND is_correct = TRUE`,
        [userId, setId]
      );

      const correctCount = parseInt(correctAnswers.rows[0].correct_count);
      const xpEarned = correctCount * 20; // 20 XP per correct answer

      // Update all attempts for this set as completed and with XP earned
      await db.query(
        `UPDATE student_quiz_attempts 
         SET completed = TRUE, xp_earned = CASE WHEN is_correct THEN 20 ELSE 0 END
         WHERE user_id = $1 AND set_id = $2`,
        [userId, setId]
      );

      // Add XP to user total
      if (xpEarned > 0) {
        await addXpToUser(userId, xpEarned);
      }

      message = `🎉 You completed this quiz set! You got ${correctCount}/${totalQuizzes} correct and earned ${xpEarned} XP.`;
    } else {
      message = isCorrect
        ? "✅ Correct! Continue to the next quiz."
        : `❌ Incorrect. The correct answer is: ${correctAnswer}`;
    }

    // Fetch updated XP
    const xpRes = await db.query("SELECT xp FROM user_xp WHERE user_id = $1", [
      userId,
    ]);
    const updatedXP = xpRes.rows.length ? xpRes.rows[0].xp : 0;
    const levelData = calculateLevelAndProgress(updatedXP);

    res.status(200).json({
      correct: isCorrect,
      correctAnswer,
      message,
      xp: updatedXP,
      ...levelData,
    });
  } catch (err) {
    console.error("Submit Quiz Error:", err.message);
    res.status(500).json({ error: "Server error submitting quiz answer" });
  }
};

/**
 * =============================
 * GET: /api/student/community/leaderboard
 * Fetch top students by XP
 * =============================
 */
const getLeaderboard = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  try {
    const result = await db.query(
      `SELECT
         ROW_NUMBER() OVER (ORDER BY COALESCE(ux.xp,0) DESC) AS rank,
         u.id AS user_id, u.first_name, u.last_name, COALESCE(ux.xp,0) AS xp
       FROM users u
       LEFT JOIN user_xp ux ON u.id = ux.user_id
       WHERE u.role='student'
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
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
};
/**
 * =============================
 * GET: /api/student/community/admin-posts
 * Fetch posts created by admins (announcements, updates)
 * =============================
 */
const getAdminPosts = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, a.first_name, a.last_name
       FROM community_posts p
       LEFT JOIN users a ON p.username = a.last_name
       WHERE p.type IN ('admin', 'challenge')
       ORDER BY p.created_at DESC`
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching admin posts:", err.message);
    res.status(500).json({ error: "Failed to fetch admin posts" });
  }
};

module.exports = {
  getCommunityPosts,
  createStudentPost,
  submitAnswer,
  getAnswersForPost,
  getQuizzes,
  submitQuiz,
  getLeaderboard,
  getAdminPosts,
};
