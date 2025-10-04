const pool = require("../config/db");

// Get all attendance records for a student
const getAttendance = async (req, res) => {
  const { student_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM attendance WHERE student_id=$1",
      [student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Create new Attendance Record
const createAttendance = async (req, res) => {
  const { student_id, week, year, sessions_attended } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO attendance (student_id, week, year, sessions_attended)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [student_id, week, year, sessions_attended]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create attendance error:", err.message);
    res.status(500).send("Server error");
  }
};

// Update Attendance
const updateAttendance = async (req, res) => {
  const { id } = req.params;
  const { week, year, sessions_attended } = req.body;

  try {
    const result = await pool.query(
      `UPDATE attendance
       SET week = $1, year = $2, sessions_attended = $3
       WHERE id = $4
       RETURNING *`,
      [week, year, sessions_attended, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Attendance record not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update attendance error:", err.message);
    res.status(500).send("Server error");
  }
};

// Delete Attendance
const deleteAttendance = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM attendance WHERE id=$1", [id]);
    res.json({ msg: "Attendance record deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
};
