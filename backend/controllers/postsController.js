const db = require("../config/db");

// ==========================
// Get all posts
// ==========================
const getAllPosts = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM community_posts ORDER BY created_at DESC"
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching posts:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ==========================
// Get posts by type
// ==========================
const getPostsByType = async (req, res) => {
  const { type } = req.query;

  try {
    const result = await db.query(
      "SELECT * FROM community_posts WHERE type = $1 ORDER BY created_at DESC",
      [type]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching posts:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ==========================
// Create new post
// ==========================
const createPost = async (req, res) => {
  const { title, body, type, username, code, ai_hint, answered_by, xp } =
    req.body;

  if (!title || !type || !username) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await db.query(
      `INSERT INTO community_posts 
      (title, body, type, username, code, ai_hint, answered_by, xp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        title,
        body,
        type,
        username,
        code || null,
        ai_hint || null,
        answered_by || null,
        xp || 10,
      ]
    );

    res.status(201).json({
      message: "Post created successfully",
      post: result.rows[0],
    });
  } catch (err) {
    console.error("Error creating post:", err.message);
    res.status(500).json({ error: "Failed to create post" });
  }
};

// ==========================
// Update post
// ==========================
const updatePost = async (req, res) => {
  const { id } = req.params;
  const { title, body, type, code, ai_hint, answered_by, xp } = req.body;

  try {
    const result = await db.query(
      `UPDATE community_posts
       SET
         title = COALESCE($1, title),
         body = COALESCE($2, body),
         type = COALESCE($3, type),
         code = COALESCE($4, code),
         ai_hint = COALESCE($5, ai_hint),
         answered_by = COALESCE($6, answered_by),
         xp = COALESCE($7, xp)
       WHERE id = $8
       RETURNING *`,
      [title, body, type, code, ai_hint, answered_by, xp, id]
    );

    if (!result.rows.length)
      return res.status(404).json({ error: "Post not found" });

    res.json({ message: "Post updated successfully", post: result.rows[0] });
  } catch (err) {
    console.error("Error updating post:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ==========================
// Delete post
// ==========================
const deletePost = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      "DELETE FROM community_posts WHERE id = $1 RETURNING *",
      [id]
    );

    if (!result.rows.length)
      return res.status(404).json({ error: "Post not found" });

    res.json({ message: "Post deleted successfully", post: result.rows[0] });
  } catch (err) {
    console.error("Error deleting post:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getAllPosts,
  getPostsByType,
  createPost,
  updatePost,
  deletePost,
};
