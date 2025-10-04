const pool = require("../config/db");
const SOCKET_URL = "https://cipherford.onrender.com";
// Get all resources for a student
const getResources = async (req, res) => {
  const { student_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM resources WHERE student_id=$1",
      [student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
// Create new Resource
const createResource = async (req, res) => {
  const { student_id, resource_name } = req.body;

  // Ensure file was uploaded
  if (!req.file) {
    return res.status(400).json({ error: "Resource file is required" });
  }

  // File URL to store in DB
  // const file_url = `${SOCKET_URL}/uploads/resources/${req.file.filename}`;
  const file_url = req.file
    ? `${SOCKET_URL}/uploads/resources/${req.file.filename}`
    : null;
  try {
    const result = await pool.query(
      "INSERT INTO resources (student_id, resource_name, file_url) VALUES ($1, $2, $3) RETURNING *",
      [student_id, resource_name, file_url]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Update Resource
const updateResource = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((key, i) => `${key}=$${i + 1}`).join(",");
    const result = await pool.query(
      `UPDATE resources SET ${setClause} WHERE id=$${
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

// Delete Resource
const deleteResource = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM resources WHERE id=$1", [id]);
    res.json({ msg: "Resource deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

module.exports = {
  getResources,
  createResource,
  updateResource,
  deleteResource,
};
