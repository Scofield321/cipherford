const db = require("../config/db");

const allQuestionsAndAnswers = async (req, res) => {
  const { type, status } = req.query;

  let query = "SELECT * FROM community_posts WHERE 1=1";
  const params = [];
  let paramIndex = 1;

  if (type) {
    if (!["question", "challenge"].includes(type)) {
      return res.status(400).json({ error: "Invalid post type" });
    }
    query += ` AND type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (status) {
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    query += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  query += " ORDER BY created_at DESC";

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

// POST /api/answers
const answers = async (req, res) => {
  const { postId, content } = req.body;
  const authorId = req.user.id;

  if (!postId || !content) {
    return res.status(400).json({ error: "Missing postId or content" });
  }

  try {
    await db.query(
      `INSERT INTO answers (content, post_id, author_id)
       VALUES ($1, $2, $3)`,
      [content, postId, authorId]
    );

    res.status(201).json({ message: "Answer submitted" });
  } catch (err) {
    console.error("Error submitting answer:", err);
    res.status(500).json({ error: "Failed to submit answer" });
  }
};

const answersOfAparticularQuestion = async (req, res) => {
  const { postId } = req.params;

  try {
    const result = await db.query(
      `SELECT a.*, u.first_name || ' ' || u.last_name AS author_name
       FROM answers a
       LEFT JOIN users u ON a.author_id = u.id
       WHERE a.post_id = $1
       ORDER BY a.created_at ASC`,
      [postId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching answers:", err);
    res.status(500).json({ error: "Failed to fetch answers" });
  }
};

// POST /api/posts
const createQuestions = async (req, res) => {
  const { title, body, type } = req.body;
  const username = req.user.last_name;

  if (!title || !body || !type) {
    return res
      .status(400)
      .json({ error: "Title, body, and type are required" });
  }

  try {
    const result = await db.query(
      `INSERT INTO community_posts (title, body, type, username)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, body, type, username]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating post:", err);
    res.status(500).json({ error: "Failed to create question" });
  }
};

const adminPosts = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, u.role AS author_role
       FROM community_posts p
       LEFT JOIN users u ON p.username = u.last_name
       WHERE u.role = 'admin'
       ORDER BY p.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching admin posts:", err);
    res.status(500).json({ error: "Failed to fetch admin posts" });
  }
};

// posts from the user who is an admin
const deletePost = async (req, res) => {
  const { postId } = req.params;
  const userRole = req.user.role;

  if (userRole !== "admin") {
    return res.status(403).json({ error: "Unauthorized: Admins only" });
  }

  try {
    const result = await db.query(
      `DELETE FROM community_posts
       WHERE id = $1
       RETURNING *`,
      [postId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ message: "Post deleted successfully", post: result.rows[0] });
  } catch (err) {
    console.error("Error deleting post:", err);
    res.status(500).json({ error: "Failed to delete post" });
  }
};

// Approve a post
const approvePost = async (req, res) => {
  const { postId } = req.params;
  const userRole = req.user.role;

  if (userRole !== "admin") {
    return res.status(403).json({ error: "Unauthorized: Admins only" });
  }

  try {
    const result = await db.query(
      `UPDATE community_posts
       SET status = 'approved'
       WHERE id = $1
       RETURNING *`,
      [postId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ message: "Post approved successfully", post: result.rows[0] });
  } catch (err) {
    console.error("Error approving post:", err);
    res.status(500).json({ error: "Failed to approve post" });
  }
};

// Reject a post
const rejectPost = async (req, res) => {
  const { postId } = req.params;
  const { reason } = req.body;
  const userRole = req.user.role;

  if (userRole !== "admin") {
    return res.status(403).json({ error: "Unauthorized: Admins only" });
  }

  if (!reason) {
    return res.status(400).json({ error: "Rejection reason is required" });
  }

  try {
    const result = await db.query(
      `UPDATE community_posts
       SET status = 'rejected', rejection_reason = $2
       WHERE id = $1
       RETURNING *`,
      [postId, reason]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ message: "Post rejected successfully", post: result.rows[0] });
  } catch (err) {
    console.error("Error rejecting post:", err);
    res.status(500).json({ error: "Failed to reject post" });
  }
};

module.exports = {
  allQuestionsAndAnswers,
  answers,
  answersOfAparticularQuestion,
  createQuestions,
  adminPosts,
  deletePost,
  approvePost,
  rejectPost,
};
