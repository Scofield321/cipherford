const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Register
const registerUser = async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    password,
    role,
    country,
    parent_email,
    child_email,
  } = req.body;
  console.log("👤 New Registration Request:", req.body);
  try {
    const hashed = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password, role, country)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, first_name, last_name, email, role, country, created_at`,
      [first_name, last_name, email, hashed, role, country]
    );

    const userId = newUser.rows[0].id;

    // ============ Role-specific Inserts ============
    if (role === "student") {
      await pool.query(
        `INSERT INTO students (user_id, level, points, attendance_week, attendance_month, plan, projects_done)
         VALUES ($1, 1, 0, 0, 0, 'Free', 0)`,
        [userId]
      );
    }

    if (role === "parent") {
      await pool.query(
        "INSERT INTO parents (user_id, phone, address) VALUES ($1, $2, $3)",
        [userId, "", ""]
      );
    }

    // ============ Relationship Linking ============
    if (role === "student" && parent_email) {
      const parentQuery = await pool.query(
        "SELECT id FROM users WHERE email = $1 AND role = 'parent'",
        [parent_email]
      );
      const parent = parentQuery.rows[0];
      if (parent) {
        await pool.query(
          `INSERT INTO children (parent_id, student_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [parent.id, userId]
        );
      }
    }

    if (role === "parent" && child_email) {
      const studentQuery = await pool.query(
        "SELECT id FROM users WHERE email = $1 AND role = 'student'",
        [child_email]
      );
      const student = studentQuery.rows[0];
      if (student) {
        await pool.query(
          `INSERT INTO children (parent_id, student_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, student.id]
        );
      }
    }
    // this is just for testing
    // ============ Token and Response ============
    const token = jwt.sign({ id: userId, role: role }, "your_jwt_secret", {
      expiresIn: "1d",
    });

    res.json({ token, user: newUser.rows[0] });
  } catch (err) {
    console.error("❌ Registration Error:", err);
    if (err.code === "23505")
      return res.status(400).json({ msg: "Email already exists" });
    res.status(500).json({ msg: "Server error" });
  }
};

// Login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userQuery = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    const user = userQuery.rows[0];

    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    // Fetch parent data if user is parent
    let parentData = {};
    if (user.role === "parent") {
      const parentQuery = await pool.query(
        "SELECT phone, address FROM parents WHERE user_id=$1",
        [user.id]
      );
      parentData = parentQuery.rows[0] || {};

      // Optional: fetch children
      const childrenQuery = await pool.query(
        `SELECT c.student_id, u.first_name, u.last_name, u.email
         FROM children c
         JOIN users u ON c.student_id = u.id
         WHERE c.parent_id = $1`,
        [user.id]
      );
      parentData.children = childrenQuery.rows;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      "your_jwt_secret",
      {
        expiresIn: "1d",
      }
    );

    res.json({
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        ...parentData, // merges phone, address, and children if parent
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// Create Admin (Secure route)
const createAdmin = async (req, res) => {
  const { first_name, last_name, email, password, country, secret } = req.body;

  if (secret !== process.env.ADMIN_CREATION_SECRET)
    return res.status(403).json({ msg: "Not authorized to create admin" });

  try {
    const hashed = await bcrypt.hash(password, 10);

    const adminResult = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password, role, country)
       VALUES ($1, $2, $3, $4, 'admin', $5)
       RETURNING id, first_name, last_name, email, role, country, created_at`,
      [first_name, last_name, email, hashed, country]
    );

    const admin = adminResult.rows[0];

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET || "your_jwt_secret",
      {
        expiresIn: "1h",
      }
    );

    res.json({ token, user: admin });
  } catch (err) {
    console.error("Create admin error:", err.message);
    if (err.code === "23505")
      return res.status(400).json({ msg: "Email already exists" });
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = { registerUser, loginUser, createAdmin };
