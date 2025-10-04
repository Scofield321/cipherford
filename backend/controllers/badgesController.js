const pool = require("../config/db");
const SOCKET_URL = "https://cipherford.onrender.com";

// Get all badges for a student
const getBadges = async (req, res) => {
  const { student_id } = req.params;

  // Only allow self or admin
  if (req.user.id !== student_id && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM badges WHERE student_id=$1",
      [student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get badges error:", err.message);
    res.status(500).send("Server error");
  }
};

// Award new badge (as PDF)
const awardBadge = async (req, res) => {
  console.log("🛠 Incoming request body:", req.body);
  console.log("🛠 Incoming file info:", req.file);

  const { student_id, title, description } = req.body;
  const file_url = req.file
    ? `${SOCKET_URL}/uploads/badges/${req.file.filename}`
    : null;

  // Only admin can award badges
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ msg: "Only admins can award badges" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO badges (student_id, title, description, file_url) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [student_id, title, description, file_url]
    );

    console.log("✅ Badge awarded:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Award badge error:", err.message);
    res.status(500).send("Server error");
  }
};

// Update badge
const updateBadge = async (req, res) => {
  const { id } = req.params;
  const { title, description, file_url } = req.body;

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ msg: "Only admins can update badges" });
  }

  try {
    const result = await pool.query(
      `UPDATE badges
       SET title=$1, description=$2, file_url=$3
       WHERE id=$4
       RETURNING *`,
      [title, description, file_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Badge not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update badge error:", err.message);
    res.status(500).send("Server error");
  }
};

// Delete badge
const removeBadge = async (req, res) => {
  const { id } = req.params;

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ msg: "Only admins can delete badges" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM badges WHERE id=$1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ msg: "Badge not found" });
    }

    res.json({ msg: "Badge deleted", badge: result.rows[0] });
  } catch (err) {
    console.error("Delete badge error:", err.message);
    res.status(500).send("Server error");
  }
};

module.exports = { getBadges, awardBadge, updateBadge, removeBadge };
