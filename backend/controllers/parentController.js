const pool = require("../config/db");

// -------------------------
// Get all parents (admin only)
// -------------------------
const getAllParents = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  try {
    const result = await pool.query(`
      SELECT u.id,
             u.first_name,
             u.last_name,
             u.email,
             u.created_at,
             u.country,
             p.session_count,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', c.student_id,
                   'first_name', uc.first_name,
                   'last_name', uc.last_name,
                   'email', uc.email
                 )
               ) FILTER (WHERE c.student_id IS NOT NULL),
               '[]'
             ) AS children
      FROM users u
      LEFT JOIN parents p ON p.user_id = u.id
      LEFT JOIN children c ON c.parent_id = u.id
      LEFT JOIN users uc ON c.student_id = uc.id
      WHERE u.role = 'parent'
      GROUP BY u.id, p.session_count
      ORDER BY u.created_at DESC
    `);

    res.json({ parents: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Failed to fetch parents" });
  }
};

// -------------------------
// Get a single parent by id
// -------------------------
const getParent = async (req, res) => {
  const { id } = req.params;

  if (req.user.id !== id && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  try {
    const result = await pool.query(
      `
      SELECT u.id,
             u.first_name,
             u.last_name,
             u.email,
             u.created_at,
             u.country,
             p.session_count,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', c.student_id,
                   'first_name', uc.first_name,
                   'last_name', uc.last_name,
                   'email', uc.email
                 )
               ) FILTER (WHERE c.student_id IS NOT NULL),
               '[]'
             ) AS children
      FROM users u
      LEFT JOIN parents p ON p.user_id = u.id
      LEFT JOIN children c ON c.parent_id = u.id
      LEFT JOIN users uc ON c.student_id = uc.id
      WHERE u.id = $1 AND u.role = 'parent'
      GROUP BY u.id, p.session_count
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Parent not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// -------------------------
// Update a parent's data(admin only)
// -------------------------
const updateParent = async (req, res) => {
  const { id } = req.params;
  const { session_count, first_name, last_name, email, country } = req.body;

  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  try {
    // Update users table
    const resultUser = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           country = COALESCE($4, country)
       WHERE id = $5 AND role = 'parent'
       RETURNING *`,
      [first_name, last_name, email, country, id]
    );

    if (resultUser.rows.length === 0) {
      return res.status(404).json({ msg: "Parent not found" });
    }

    // Update parents table
    await pool.query(
      `UPDATE parents
       SET session_count = COALESCE($1, session_count)
       WHERE user_id = $2`,
      [session_count, id]
    );

    res.json({
      msg: "Parent updated successfully",
      parent: resultUser.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Failed to update parent" });
  }
};

// -------------------------
// Delete a parent (admin only)
// -------------------------
const deleteParent = async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  try {
    const deleted = await pool.query(
      `DELETE FROM users WHERE id = $1 AND role = 'parent' RETURNING *`,
      [id]
    );

    if (deleted.rows.length === 0) {
      return res.status(404).json({ msg: "Parent not found" });
    }

    res.json({ msg: "Parent deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = {
  getAllParents,
  getParent,
  updateParent,
  deleteParent,
};

// this is just for testing
