const pool = require("../config/db");

// GET /api/admin/stats
const getAdminDashboardStats = async (req, res) => {
  try {
    // Total users
    const totalUsersRes = await pool.query(`SELECT COUNT(*) FROM users`);
    const totalUsers = parseInt(totalUsersRes.rows[0].count);

    // Total students
    const studentsRes = await pool.query(`SELECT * FROM students`);
    const students = studentsRes.rows;
    const totalStudents = students.length;
    // this is just for testing
    // Total parents
    const totalParentsRes = await pool.query(
      `SELECT COUNT(*) FROM users WHERE role = 'parent'`
    );
    const totalParents = parseInt(totalParentsRes.rows[0].count);

    // Monthly signups (this month)
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const monthlySignupsRes = await pool.query(
      `SELECT COUNT(*) FROM users 
       WHERE EXTRACT(MONTH FROM created_at) = $1 
       AND EXTRACT(YEAR FROM created_at) = $2`,
      [currentMonth, currentYear]
    );
    const monthlySignups = parseInt(monthlySignupsRes.rows[0].count);

    // Upcoming sessions
    const upcomingRes = await pool.query(
      `SELECT COUNT(*) FROM upcoming_sessions`
    );
    const upcomingSessions = parseInt(upcomingRes.rows[0].count);

    // Plan distribution
    const planResult = await pool.query(`
      SELECT plan, COUNT(*) AS count
      FROM students
      GROUP BY plan
    `);
    const planDistribution = {};
    planResult.rows.forEach((row) => {
      planDistribution[row.plan || "Free"] = parseInt(row.count);
    });

    // Signups per month (include all 12 months, even if 0 signups)
    const months = Array.from(
      { length: 12 },
      (_, i) => `${currentYear}-${String(i + 1).padStart(2, "0")}`
    );

    const signupsPerMonthRes = await pool.query(
      `
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS signups
      FROM users
      WHERE EXTRACT(YEAR FROM created_at) = $1 AND role = 'student'
      GROUP BY month
    `,
      [currentYear]
    );

    const signupMap = {};
    signupsPerMonthRes.rows.forEach((row) => {
      signupMap[row.month] = parseInt(row.signups);
    });

    const monthlySignupData = months.map((month) => ({
      month,
      count: signupMap[month] || 0,
    }));

    // Response
    res.json({
      totalUsers,
      totalStudents,
      totalParents,
      monthlySignups,
      upcomingSessions,
      planDistribution,
      monthlySignupData,
    });
  } catch (err) {
    console.error("Dashboard Stats Error:", err.message);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};

module.exports = { getAdminDashboardStats };
