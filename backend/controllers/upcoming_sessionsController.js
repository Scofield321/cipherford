const pool = require("../config/db");

// ---------- GET SESSIONS ----------
const getSessions = async (req, res) => {
  const { student_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM upcoming_sessions WHERE student_id=$1 ORDER BY date, time",
      [student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while fetching sessions" });
  }
};
// this is just for testing
// ---------- CREATE SESSION ----------
const createSession = async (req, res) => {
  const { student_id, topic, date, time } = req.body;

  if (!student_id || !topic || !date || !time) {
    return res
      .status(400)
      .json({ error: "student_id, topic, date, and time are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO upcoming_sessions (student_id, topic, date, time)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [student_id, topic, date, time]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create session error:", err);
    res.status(500).json({ error: "Server error while creating session" });
  }
};

// ---------- UPDATE SESSION ----------
const updateSession = async (req, res) => {
  const { id } = req.params;
  const { topic, date, time } = req.body;

  if (!topic || !date || !time) {
    return res
      .status(400)
      .json({ error: "topic, date, and time are required" });
  }

  try {
    const result = await pool.query(
      `UPDATE upcoming_sessions
       SET topic = $1, date = $2, time = $3
       WHERE id = $4
       RETURNING *`,
      [topic, date, time, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update session error:", err);
    res.status(500).json({ error: "Server error while updating session" });
  }
};

// ---------- DELETE SESSION ----------
const deleteSession = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM upcoming_sessions WHERE id=$1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json({ msg: "Session deleted" });
  } catch (err) {
    console.error("Delete session error:", err);
    res.status(500).json({ error: "Server error while deleting session" });
  }
};

module.exports = { getSessions, createSession, updateSession, deleteSession };
