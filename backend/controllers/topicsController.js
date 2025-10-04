const pool = require("../config/db");

// Get all topics for a student
const getTopics = async (req, res) => {
  const { student_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM topics WHERE student_id=$1",
      [student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
// this is just for testing
// Create new Topic
const createTopic = async (req, res) => {
  const { student_id, topic, file_url } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO topics (student_id, topic, file_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [student_id, topic, file_url]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create topic error:", err.message);
    res.status(500).send("Server error");
  }
};

// Update Topic
const updateTopic = async (req, res) => {
  const { id } = req.params;
  const { topic, file_url } = req.body;

  try {
    const result = await pool.query(
      `UPDATE topics
       SET topic = $1, file_url = $2
       WHERE id = $3
       RETURNING *`,
      [topic, file_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Topic not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update topic error:", err.message);
    res.status(500).send("Server error");
  }
};

// Delete Topic
const deleteTopic = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM topics WHERE id=$1", [id]);
    res.json({ msg: "Topic deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

module.exports = { getTopics, createTopic, updateTopic, deleteTopic };
