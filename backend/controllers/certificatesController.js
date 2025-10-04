const pool = require("../config/db");
const SOCKET_URL = "https://cipherford.onrender.com";
// Get all certificates for a student
const getCertificates = async (req, res) => {
  const { student_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM certificates WHERE student_id=$1",
      [student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
// Issue new Certificate
const issueCertificate = async (req, res) => {
  console.log("🛠 Incoming request body:", req.body);
  console.log("🛠 Incoming file info:", req.file);

  const { student_id, title, description } = req.body;

  // Log extracted values
  console.log("🛠 Extracted student_id:", student_id);
  console.log("🛠 Extracted title:", title);
  console.log("🛠 Extracted description:", description);

  const file_url = req.file
    ? `${SOCKET_URL}/uploads/certificates/${req.file.filename}`
    : null;

  console.log("🛠 Computed file_url:", file_url);
  // testing
  // Restrict to admin only
  if (!req.user) {
    console.log("❌ No user info in request");
    return res.status(401).json({ msg: "User not authenticated" });
  }

  if (req.user.role !== "admin") {
    console.log("❌ Unauthorized user role:", req.user.role);
    return res.status(403).json({ msg: "Only admins can issue certificates" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO certificates (student_id, title, description, file_url) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [student_id, title, description, file_url]
    );

    console.log("✅ Insert result:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Issue certificate error:", err.message);
    res.status(500).send("Server error");
  }
};

// testing issues

const updateCertificate = async (req, res) => {
  const { id } = req.params;
  const { title, description, file_url } = req.body;

  // Only admin can update certificates
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Only admins can update certificates" });
  }

  try {
    const result = await pool.query(
      `UPDATE certificates
       SET title = $1, description = $2, file_url = $3
       WHERE id = $4
       RETURNING *`,
      [title, description, file_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Certificate not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update certificate error:", err.message);
    res.status(500).send("Server error");
  }
};

// Delete Certificate
const revokeCertificate = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM certificates WHERE id=$1", [id]);
    res.json({ msg: "Certificate deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

module.exports = {
  getCertificates,
  issueCertificate,
  updateCertificate,
  revokeCertificate,
};
