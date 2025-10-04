const pool = require("../config/db");

// Get children of a parent
const getChildren = async (req, res) => {
  const { parent_id } = req.params;
  try {
    const children = await pool.query(
      `SELECT s.user_id AS student_id, s.level, s.points, s.plan, c.created_at
       FROM children c
       JOIN students s ON c.student_id = s.user_id
       WHERE c.parent_id = $1`,
      [parent_id]
    );
    res.json(children.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
// this is just for testing
// Link a child to a parent
const addChild = async (req, res) => {
  const { parent_id, student_id } = req.body;
  try {
    const exists = await pool.query(
      "SELECT * FROM children WHERE parent_id=$1 AND student_id=$2",
      [parent_id, student_id]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ msg: "Child already linked" });
    }

    const newLink = await pool.query(
      "INSERT INTO children (parent_id, student_id) VALUES ($1,$2) RETURNING *",
      [parent_id, student_id]
    );

    res.json(newLink.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Remove child-parent link
const removeChild = async (req, res) => {
  const { parent_id, student_id } = req.body;
  try {
    const result = await pool.query(
      "DELETE FROM children WHERE parent_id=$1 AND student_id=$2 RETURNING *",
      [parent_id, student_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Child-parent link not found" });
    }

    res.json({ msg: "Child removed", link: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

module.exports = { getChildren, addChild, removeChild };
