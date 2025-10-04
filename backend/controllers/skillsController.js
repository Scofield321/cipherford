const pool = require("../config/db");

// Get all skills for a student
const getSkills = async (req, res) => {
  const { student_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM skills WHERE student_id=$1",
      [student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
// this is just for testing
// Create new Skill
const unlockSkill = async (req, res) => {
  const { student_id, skill_name } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO skills (student_id, skill_name, unlocked_at)
       VALUES ($1, $2, NOW())
       RETURNING *`,
      [student_id, skill_name]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Unlock skill error:", err.message);
    res.status(500).send("Server error");
  }
};

const updateSkill = async (req, res) => {
  const { id } = req.params; // skill record ID
  const { skill_name } = req.body;

  // Optional: Only admin or teacher can update skills
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Not authorized to update skills" });
  }

  try {
    const result = await pool.query(
      `UPDATE skills
       SET skill_name = $1
       WHERE id = $2
       RETURNING *`,
      [skill_name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Skill not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update skill error:", err.message);
    res.status(500).send("Server error");
  }
};

// Delete Skill
const removeSkill = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM skills WHERE id=$1", [id]);
    res.json({ msg: "Skill deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

module.exports = { getSkills, unlockSkill, updateSkill, removeSkill };
