const db = require("../config/db");

// ➕ Add a reaction or clarification comment
const addAnswerReaction = async (req, res) => {
  const answerId = req.params.answerId.trim();
  const { reaction_type, comment, parent_comment_id } = req.body;
  const user_id = req.user.id;

  try {
    let result;

    // 🔹 If it's a reply or comment, always insert a new record
    if (comment && !reaction_type) {
      result = await db.query(
        `INSERT INTO community_answer_reactions (answer_id, user_id, comment, parent_comment_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [answerId, user_id, comment, parent_comment_id || null]
      );
    } else {
      // 🔹 If it's a reaction (like/dislike), handle toggle logic as before
      const existing = await db.query(
        `SELECT * FROM community_answer_reactions 
         WHERE answer_id = $1 AND user_id = $2 AND parent_comment_id IS NULL`,
        [answerId, user_id]
      );

      if (existing.rowCount > 0) {
        // Update existing reaction
        result = await db.query(
          `UPDATE community_answer_reactions
           SET reaction_type = $1, comment = $2, created_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [
            reaction_type || existing.rows[0].reaction_type,
            comment || existing.rows[0].comment,
            existing.rows[0].id,
          ]
        );
      } else {
        // Insert new reaction (like/dislike)
        result = await db.query(
          `INSERT INTO community_answer_reactions (answer_id, user_id, reaction_type, comment)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [answerId, user_id, reaction_type || null, comment || null]
        );
      }
    }

    // Fetch updated counts for frontend (ignores replies)
    const counts = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE reaction_type = 'like') AS likes,
         COUNT(*) FILTER (WHERE reaction_type = 'dislike') AS dislikes
       FROM community_answer_reactions
       WHERE answer_id = $1 AND parent_comment_id IS NULL`,
      [answerId]
    );

    res.status(200).json({
      addedOrUpdated: result.rows[0],
      likes: parseInt(counts.rows[0].likes),
      dislikes: parseInt(counts.rows[0].dislikes),
    });
  } catch (err) {
    console.error("❌ Error adding reaction:", err);

    if (err.code === "23505") {
      return res.status(409).json({ error: "Reaction already exists." });
    }

    res.status(500).json({ error: "Failed to add reaction." });
  }
};

// Get all reactions for a given answer
const getAnswerReactions = async (req, res) => {
  const answerId = req.params.answerId.trim();

  try {
    // 1️⃣ Fetch like/dislike counts
    const counts = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE reaction_type = 'like') AS likes,
         COUNT(*) FILTER (WHERE reaction_type = 'dislike') AS dislikes
       FROM community_answer_reactions
       WHERE answer_id = $1 AND parent_comment_id IS NULL`,
      [answerId]
    );

    // 2️⃣ Fetch all comments (including replies)
    const commentsRes = await db.query(
      `SELECT
         car.id,
         car.comment,
         car.user_id,
         u.first_name,
         u.last_name,
         car.created_at,
         car.parent_comment_id
       FROM community_answer_reactions car
       JOIN users u ON u.id = car.user_id
       WHERE car.answer_id = $1 AND car.comment IS NOT NULL
       ORDER BY car.created_at ASC`,
      [answerId]
    );

    // 3️⃣ Build nested comments and replies
    const comments = [];
    const commentMap = {};

    commentsRes.rows.forEach((row) => {
      const comment = {
        id: row.id,
        comment: row.comment,
        user_id: row.user_id,
        full_name: `${row.first_name} ${row.last_name}`.trim(),
        created_at: row.created_at,
        parent_comment_id: row.parent_comment_id,
        replies: [],
      };

      commentMap[comment.id] = comment;

      if (comment.parent_comment_id) {
        // Attach to parent if it exists
        if (commentMap[comment.parent_comment_id]) {
          commentMap[comment.parent_comment_id].replies.push(comment);
        } else {
          // If parent not found, push as top-level just in case
          comments.push(comment);
        }
      } else {
        comments.push(comment);
      }
    });

    res.status(200).json({
      likes: parseInt(counts.rows[0].likes),
      dislikes: parseInt(counts.rows[0].dislikes),
      comments,
    });
  } catch (err) {
    console.error("❌ Error fetching reactions:", err);
    res.status(500).json({ error: "Failed to fetch reactions." });
  }
};

// ❌ Delete a reaction
const deleteAnswerReaction = async (req, res) => {
  const reactionId = req.params.reactionId.trim();
  const user_id = req.user.id;

  try {
    const result = await db.query(
      `DELETE FROM community_answer_reactions
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [reactionId, user_id]
    );

    if (result.rowCount === 0)
      return res
        .status(404)
        .json({ error: "Reaction not found or unauthorized." });

    res.status(200).json({
      message: "Reaction deleted successfully.",
      deleted: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error deleting reaction:", err);
    res.status(500).json({ error: "Failed to delete reaction." });
  }
};

// ✏️ Update a reaction
const updateAnswerReaction = async (req, res) => {
  const reactionId = req.params.reactionId.trim();
  const { reaction_type, comment } = req.body;
  const user_id = req.user.id;

  try {
    const result = await db.query(
      `UPDATE community_answer_reactions
       SET reaction_type = $1, comment = $2
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [reaction_type || null, comment || null, reactionId, user_id]
    );

    if (result.rowCount === 0)
      return res
        .status(404)
        .json({ error: "Reaction not found or unauthorized." });

    res.status(200).json({
      message: "Reaction updated successfully.",
      updated: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating reaction:", err);
    res.status(500).json({ error: "Failed to update reaction." });
  }
};

module.exports = {
  addAnswerReaction,
  getAnswerReactions,
  deleteAnswerReaction,
  updateAnswerReaction,
};
