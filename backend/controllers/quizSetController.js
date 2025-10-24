const db = require("../config/db");

// Get all quiz sets
const getAllQuizSets = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, COUNT(q.id) AS total_questions
      FROM community_quiz_sets s
      LEFT JOIN community_quizzes q ON q.set_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching quiz sets:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Get one quiz set with all questions
// Helper to parse options from DB
const parseOptions = (options) => {
  if (!options) return [];
  return Array.isArray(options) ? options : options.split(",");
};

// Get one quiz set with all questions
const getQuizSetById = async (req, res) => {
  const { id } = req.params;
  try {
    const setRes = await db.query(
      "SELECT * FROM community_quiz_sets WHERE id=$1",
      [id]
    );
    if (!setRes.rows.length)
      return res.status(404).json({ error: "Quiz set not found" });

    const quizzesRes = await db.query(
      "SELECT * FROM community_quizzes WHERE set_id=$1 ORDER BY created_at ASC",
      [id]
    );

    // Convert options to array
    const quizzes = quizzesRes.rows.map((q) => ({
      ...q,
      options: parseOptions(q.options),
    }));

    res.status(200).json({
      ...setRes.rows[0],
      quizzes,
    });
  } catch (err) {
    console.error("Error fetching quiz set:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Get quizzes that belong to a specific set
const getSetQuizzes = async (req, res) => {
  const { set_id } = req.params;
  try {
    const result = await db.query(
      `SELECT * FROM community_quizzes WHERE set_id = $1 ORDER BY created_at ASC`,
      [set_id]
    );

    const quizzes = result.rows.map((q) => ({
      ...q,
      options: parseOptions(q.options),
    }));

    res.status(200).json(quizzes);
  } catch (err) {
    console.error("Error fetching set quizzes:", err.message);
    res.status(500).json({ error: "Server error fetching set quizzes" });
  }
};

// Get regular (non-set) quizzes
const getRegularQuizzes = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM community_quizzes WHERE set_id IS NULL ORDER BY created_at DESC`
    );

    const quizzes = result.rows.map((q) => ({
      ...q,
      options: parseOptions(q.options),
    }));

    res.status(200).json(quizzes);
  } catch (err) {
    console.error("Error fetching regular quizzes:", err.message);
    res.status(500).json({ error: "Server error fetching regular quizzes" });
  }
};

// Create a new quiz set
const createQuizSet = async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Only admins can create quiz sets" });

  const { title, description, category } = req.body;

  if (!title || !description || !category)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    const result = await db.query(
      `INSERT INTO community_quiz_sets (title, description, category, created_by, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [title, description, category, req.user.id]
    );
    res.status(201).json({
      message: "Quiz set created successfully",
      set: result.rows[0],
    });
  } catch (err) {
    console.error("Error creating quiz set:", err.message);
    res.status(500).json({ error: "Server error creating quiz set" });
  }
};

// Helper to normalize options for DB storage
const normalizeOptions = (options) => {
  if (!options) return null;
  return Array.isArray(options) ? options.join(",") : options;
};

// Add a question to a quiz set
const addQuestionToSet = async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Only admins can add questions" });

  const { set_id } = req.params;
  let { question, options, correct_answer, tags } = req.body;

  // Trim strings
  question = question?.trim();
  correct_answer = correct_answer?.trim();
  tags = Array.isArray(tags) ? tags.map((tag) => tag.trim()) : [];
  options = Array.isArray(options) ? options.map((opt) => opt.trim()) : [];

  if (!set_id || !question || !options || !correct_answer)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    const checkSet = await db.query(
      "SELECT id FROM community_quiz_sets WHERE id=$1",
      [set_id]
    );
    if (!checkSet.rows.length)
      return res.status(404).json({ error: "Quiz set not found" });

    const result = await db.query(
      `INSERT INTO community_quizzes (question, options, correct_answer, tags, set_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [question, options, correct_answer, tags || [], set_id]
    );

    res.status(201).json({
      message: "Question added successfully to set",
      quiz: result.rows[0],
    });
  } catch (err) {
    console.error("Error adding question to set:", err.message);
    res.status(500).json({ error: "Server error adding question" });
  }
};

// Update a quiz question
const updateQuestion = async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Only admins can update questions" });

  const { id } = req.params;
  const { question, options, correct_answer, tags } = req.body;

  if (!question && !options && !correct_answer && !tags)
    return res
      .status(400)
      .json({ error: "At least one field is required to update" });

  try {
    const result = await db.query(
      `UPDATE community_quizzes
       SET question = COALESCE($1, question),
           options = COALESCE($2, options),
           correct_answer = COALESCE($3, correct_answer),
           tags = COALESCE($4, tags)
       WHERE id = $5
       RETURNING *`,
      [
        question,
        options ? normalizeOptions(options) : null,
        correct_answer,
        tags,
        id,
      ]
    );

    if (!result.rows.length)
      return res.status(404).json({ error: "Question not found" });

    res.status(200).json({
      message: "Question updated successfully",
      quiz: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating question:", err.message);
    res.status(500).json({ error: "Server error updating question" });
  }
};

// Delete a quiz set and its questions
const deleteQuizSet = async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Only admins can delete quiz sets" });

  const { id } = req.params;
  try {
    await db.query("DELETE FROM community_quizzes WHERE set_id=$1", [id]);
    const result = await db.query(
      "DELETE FROM community_quiz_sets WHERE id=$1 RETURNING *",
      [id]
    );
    if (!result.rows.length)
      return res.status(404).json({ error: "Quiz set not found" });

    res.status(200).json({ message: "Quiz set deleted successfully" });
  } catch (err) {
    console.error("Error deleting quiz set:", err.message);
    res.status(500).json({ error: "Server error deleting quiz set" });
  }
};

// // Update a quiz question
// const updateQuestion = async (req, res) => {
//   if (req.user.role !== "admin")
//     return res.status(403).json({ error: "Only admins can update questions" });

//   const { id } = req.params;
//   const { question, options, correct_answer, tags } = req.body;

//   if (!question && !options && !correct_answer && !tags)
//     return res
//       .status(400)
//       .json({ error: "At least one field is required to update" });

//   try {
//     const result = await db.query(
//       `UPDATE community_quizzes
//        SET question = COALESCE($1, question),
//            options = COALESCE($2, options),
//            correct_answer = COALESCE($3, correct_answer),
//            tags = COALESCE($4, tags)
//        WHERE id = $5
//        RETURNING *`,
//       [question, options, correct_answer, tags, id]
//     );

//     if (!result.rows.length)
//       return res.status(404).json({ error: "Question not found" });

//     res.status(200).json({
//       message: "Question updated successfully",
//       quiz: result.rows[0],
//     });
//   } catch (err) {
//     console.error("Error updating question:", err.message);
//     res.status(500).json({ error: "Server error updating question" });
//   }
// };

// Delete a quiz question
const deleteQuestion = async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Only admins can delete questions" });

  const { id } = req.params;

  try {
    const result = await db.query(
      "DELETE FROM community_quizzes WHERE id=$1 RETURNING *",
      [id]
    );

    if (!result.rows.length)
      return res.status(404).json({ error: "Question not found" });

    res.status(200).json({ message: "Question deleted successfully" });
  } catch (err) {
    console.error("Error deleting question:", err.message);
    res.status(500).json({ error: "Server error deleting question" });
  }
};

// Get quizzes that belong to a specific set
// const getSetQuizzes = async (req, res) => {
//   const { set_id } = req.params;
//   try {
//     const result = await db.query(
//       `SELECT * FROM community_quizzes WHERE set_id = $1 ORDER BY created_at ASC`,
//       [set_id]
//     );
//     res.status(200).json(result.rows);
//   } catch (err) {
//     console.error("Error fetching set quizzes:", err.message);
//     res.status(500).json({ error: "Server error fetching set quizzes" });
//   }
// };

// Get regular (non-set) quizzes
// const getRegularQuizzes = async (req, res) => {
//   try {
//     const result = await db.query(
//       `SELECT * FROM community_quizzes WHERE set_id IS NULL ORDER BY created_at DESC`
//     );
//     res.status(200).json(result.rows);
//   } catch (err) {
//     console.error("Error fetching regular quizzes:", err.message);
//     res.status(500).json({ error: "Server error fetching regular quizzes" });
//   }
// };

module.exports = {
  getAllQuizSets,
  getQuizSetById,
  createQuizSet,
  addQuestionToSet,
  deleteQuizSet,
  updateQuestion,
  deleteQuestion,
  getSetQuizzes,
  getRegularQuizzes,
};
