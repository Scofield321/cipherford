const express = require("express");
const router = express.Router();
const pool = require("../../config/db");
const changePassword = require("../../controllers/changePasswordController");
const { auth, adminAuth } = require("../../middleware/auth");
// const auth = require("../../middleware/auth");

/**
 * GET /api/users/me
 * Get current logged-in user info
 */
router.get("/me", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user + parent info (including session_count)
    const userQuery = await pool.query(
      `
      SELECT u.*, p.phone, p.address, p.session_count
      FROM users u
      LEFT JOIN parents p ON u.id = p.user_id
      WHERE u.id = $1
      `,
      [userId]
    );

    const user = userQuery.rows[0];
    if (!user) return res.status(404).json({ msg: "User not found" });

    let children = [];

    if (user.role === "parent") {
      // Fetch children with extended student info
      const childrenQuery = await pool.query(
        `
        SELECT u.id, u.first_name, u.last_name, u.email, u.country,
               s.level, s.points, s.attendance_week AS "attendanceWeek",
               s.attendance_month AS "attendanceMonth", s.projects_done AS "projectsDone"
        FROM children c
        JOIN users u ON c.student_id = u.id
        LEFT JOIN students s ON u.id = s.user_id
        WHERE c.parent_id = $1
        `,
        [user.id]
      );

      children = await Promise.all(
        childrenQuery.rows.map(async (child) => {
          const [sessionsQuery, badgesQuery, certificatesQuery, skillsQuery] =
            await Promise.all([
              pool.query(
                `SELECT topic, date, time
                 FROM upcoming_sessions
                 WHERE student_id = $1
                 ORDER BY date ASC, time ASC`,
                [child.id]
              ),
              pool.query(
                `SELECT title, description, file_url, awarded_at
                 FROM badges
                 WHERE student_id = $1
                 ORDER BY awarded_at DESC`,
                [child.id]
              ),
              pool.query(
                `SELECT title, description, file_url, issued_at
                 FROM certificates
                 WHERE student_id = $1
                 ORDER BY issued_at DESC`,
                [child.id]
              ),
              pool.query(
                `SELECT skill_name, unlocked_at
                 FROM skills
                 WHERE student_id = $1
                 ORDER BY unlocked_at ASC`,
                [child.id]
              ),
            ]);

          return {
            ...child,
            username: `${child.first_name} ${child.last_name}`,
            upcomingSessions: sessionsQuery.rows,
            badges: badgesQuery.rows,
            certificates: certificatesQuery.rows,
            skills: skillsQuery.rows,
          };
        })
      );
    }

    res.json({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: `${user.first_name} ${user.last_name}`,
      email: user.email,
      role: user.role,
      country: user.country,
      phone: user.phone ?? "",
      address: user.address ?? "",
      session_count: user.session_count ?? 0,
      children,
    });
  } catch (err) {
    console.error("Error in /me route:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * POST /api/users/change-password
 */
router.post("/change-password", auth, changePassword);

/**
 * ADMIN ROUTES
 */

/**
 * GET /api/users/all
 * Get all users (admin-only)
 */
router.get("/all", adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, first_name, last_name, email, role, country, created_at
      FROM users
      ORDER BY created_at DESC
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching all users:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user by ID (admin-only)
 */
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    // Remove from related tables if needed
    await pool.query(
      "DELETE FROM children WHERE student_id=$1 OR parent_id=$1",
      [userId]
    );
    await pool.query("DELETE FROM students WHERE user_id=$1", [userId]);
    await pool.query("DELETE FROM parents WHERE user_id=$1", [userId]);
    await pool.query("DELETE FROM users WHERE id=$1", [userId]);

    res.json({ msg: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
// this is just for testing
