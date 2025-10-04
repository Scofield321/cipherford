const pool = require("../config/db");

// Get all weekly points for a student
const getWeeklyPoints = async (req, res) => {
  const { student_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM weekly_points WHERE student_id=$1",
      [student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
// this is just for testing
// Create new Weekly Points Record
const createWeeklyPoint = async (req, res) => {
  const { student_id, week, year, points } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO weekly_points (student_id, week, year, points)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [student_id, week, year, points]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create weekly point error:", err.message);
    res.status(500).send("Server error");
  }
};

// Update Weekly Points
const updateWeeklyPoint = async (req, res) => {
  const { id } = req.params;
  const { week, year, points } = req.body;

  try {
    const result = await pool.query(
      `UPDATE weekly_points
       SET week = $1, year = $2, points = $3
       WHERE id = $4
       RETURNING *`,
      [week, year, points, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Weekly point record not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update weekly point error:", err.message);
    res.status(500).send("Server error");
  }
};

// Delete Weekly Points
const deleteWeeklyPoint = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM weekly_points WHERE id=$1", [id]);
    res.json({ msg: "Weekly points record deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

module.exports = {
  getWeeklyPoints,
  createWeeklyPoint,
  updateWeeklyPoint,
  deleteWeeklyPoint,
};
