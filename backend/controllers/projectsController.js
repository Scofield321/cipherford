const pool = require("../config/db");

// Get all projects for a student
const getProjects = async (req, res) => {
  const { student_id } = req.params;

  // Allow: the student themselves or admin
  if (req.user.id !== student_id && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM projects WHERE student_id=$1",
      [student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
// this is just for testing
// Create new Project
const createProject = async (req, res) => {
  const { student_id } = req.body;

  // Only the student themselves or admin can create
  if (req.user.id !== student_id && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  try {
    const keys = Object.keys(req.body);
    const values = Object.values(req.body);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");

    const result = await pool.query(
      `INSERT INTO projects (${keys.join(
        ","
      )}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Update Project
const updateProject = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Fetch the project to check ownership
    const projectQuery = await pool.query(
      "SELECT * FROM projects WHERE id=$1",
      [id]
    );
    const project = projectQuery.rows[0];

    if (!project) return res.status(404).json({ msg: "Project not found" });

    // Only the student owner or admin can update
    if (req.user.id !== project.student_id && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((key, i) => `${key}=$${i + 1}`).join(",");

    const result = await pool.query(
      `UPDATE projects SET ${setClause} WHERE id=$${
        keys.length + 1
      } RETURNING *`,
      [...values, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Delete Project
const deleteProject = async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch the project to check ownership
    const projectQuery = await pool.query(
      "SELECT * FROM projects WHERE id=$1",
      [id]
    );
    const project = projectQuery.rows[0];

    if (!project) return res.status(404).json({ msg: "Project not found" });

    // Only the student owner or admin can delete
    if (req.user.id !== project.student_id && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    await pool.query("DELETE FROM projects WHERE id=$1", [id]);
    res.json({ msg: "Project deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

module.exports = { getProjects, createProject, updateProject, deleteProject };
