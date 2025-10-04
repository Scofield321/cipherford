const pool = require("../config/db");

// -------------------------
// Get all students (admin only) with user info
// -------------------------
const getAllStudents = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  try {
    const result = await pool.query(`
      SELECT s.user_id AS id, s.level, s.points, s.plan, s.projects_done,
             s.attendance_week, s.attendance_month,
             u.first_name, u.last_name, u.email
      FROM students s
      JOIN users u ON s.user_id = u.id
    `);

    res.json({ students: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Failed to fetch students" });
  }
};

// -------------------------
// Get a single student by id with user info + upcoming sessions
// -------------------------
const getStudent = async (req, res) => {
  const { id } = req.params;

  if (req.user.id !== id && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  try {
    // 1️⃣ Fetch student info
    const studentRes = await pool.query(
      `SELECT s.user_id AS id, s.level, s.points, s.plan, s.projects_done,
              s.attendance_week, s.attendance_month,
              u.first_name, u.last_name, u.email
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = $1`,
      [id]
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ msg: "Student not found" });
    }

    const student = studentRes.rows[0];

    // 2️⃣ Fetch upcoming sessions
    const sessionsRes = await pool.query(
      `SELECT topic, date, time FROM upcoming_sessions WHERE student_id=$1 ORDER BY date, time`,
      [id]
    );

    student.upcoming_sessions = sessionsRes.rows || [];

    res.json(student);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// -------------------------
// Update student profile with upcoming sessions
// -------------------------
const updateStudentWithSessions = async (req, res) => {
  const { id } = req.params;
  const {
    level,
    points,
    plan,
    projects_done,
    attendance_week,
    attendance_month,
    upcomingSessions,
  } = req.body;

  if (req.user.id !== id && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  try {
    // 1️⃣ Update student info
    const updated = await pool.query(
      `UPDATE students SET level=$1, points=$2, plan=$3, projects_done=$4,
       attendance_week=$5, attendance_month=$6
       WHERE user_id=$7 RETURNING *`,
      [
        level,
        points,
        plan,
        projects_done,
        attendance_week,
        attendance_month,
        id,
      ]
    );

    if (updated.rows.length === 0)
      return res.status(404).json({ msg: "Student not found" });

    // 2️⃣ Replace upcoming sessions
    if (Array.isArray(upcomingSessions)) {
      await pool.query(`DELETE FROM upcoming_sessions WHERE student_id=$1`, [
        id,
      ]);

      const insertValues = [];
      const placeholders = upcomingSessions
        .map((s, i) => {
          insertValues.push(id, s.topic, s.date, s.time);
          const idx = i * 4;
          return `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4})`;
        })
        .join(", ");

      if (insertValues.length > 0) {
        await pool.query(
          `INSERT INTO upcoming_sessions(student_id, topic, date, time) VALUES ${placeholders}`,
          insertValues
        );
      }
    }

    // 3️⃣ Get the updated full student info + sessions again
    const studentRes = await pool.query(
      `SELECT s.user_id AS id, s.level, s.points, s.plan, s.projects_done,
              s.attendance_week, s.attendance_month,
              u.first_name, u.last_name, u.email
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = $1`,
      [id]
    );

    const student = studentRes.rows[0];

    const sessionsRes = await pool.query(
      `SELECT topic, date, time FROM upcoming_sessions WHERE student_id=$1 ORDER BY date, time`,
      [id]
    );

    student.upcoming_sessions = sessionsRes.rows || [];

    // 4️⃣ Emit update via Socket.io
    const io = req.app.get("io");
    io.to(`student_${id}`).emit("student_updated", student);

    // 5️⃣ Respond normally
    res.json({ msg: "Student updated successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// -------------------------
// Get leaderboard (all students ordered by points)
// -------------------------
const getStudentLeaderboard = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.user_id AS id,
        s.level,
        s.points,
        u.first_name,
        u.last_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.points DESC, s.level DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching leaderboard:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};
const deleteStudent = async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  try {
    const deleted = await pool.query(
      `DELETE FROM users WHERE id = $1 AND role = 'student' RETURNING *`,
      [id]
    );

    if (deleted.rows.length === 0) {
      return res.status(404).json({ msg: "Student not found" });
    }

    res.json({ msg: "Student deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = {
  getAllStudents,
  getStudent,
  updateStudentWithSessions,
  getStudentLeaderboard,
  deleteStudent,
};
// this is just for testing
