const pool = require("../config/db");
const supabase = require("../config/superbase");
const fs = require("fs");
const path = require("path");

// -------------------------
// GET Certificates for a student
// -------------------------
const getCertificates = async (req, res) => {
  const { student_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM certificates WHERE student_id=$1",
      [student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get certificates error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// -------------------------
// ISSUE Certificate
// -------------------------
const issueCertificate = async (req, res) => {
  const { student_id, title, description } = req.body;

  if (!req.user) return res.status(401).json({ msg: "User not authenticated" });
  if (req.user.role !== "admin")
    return res.status(403).json({ msg: "Only admins can issue certificates" });

  let file_url = null;

  try {
    if (req.file) {
      const filePath = req.file.path;
      const fileName = `${Date.now()}-${req.file.originalname}`;

      // Read file into buffer
      const fileData = fs.readFileSync(filePath);

      // Upload to Supabase v1
      const { error: uploadError } = await supabase.storage
        .from("student-files")
        .upload(fileName, fileData, {
          cacheControl: "3600",
          upsert: false,
          contentType: "application/pdf",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { publicURL, error: urlError } = supabase.storage
        .from("student-files")
        .getPublicUrl(fileName);

      if (urlError) throw urlError;

      file_url = publicURL;

      // Delete local temp file
      fs.unlinkSync(filePath);
    }

    const result = await pool.query(
      `INSERT INTO certificates (student_id, title, description, file_url) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [student_id, title, description, file_url]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Issue certificate error:", err.message);
    res.status(500).json({ msg: err.message });
  }
};

// -------------------------
// UPDATE Certificate
// -------------------------
const updateCertificate = async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ msg: "Only admins can update certificates" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT * FROM certificates WHERE id=$1",
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ msg: "Certificate not found" });

    const certificate = rows[0];
    let file_url = certificate.file_url;

    if (req.file) {
      const filePath = req.file.path;
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const fileData = fs.readFileSync(filePath);

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from("student-files")
        .upload(fileName, fileData, {
          cacheControl: "3600",
          upsert: false,
          contentType: "application/pdf",
        });

      if (uploadError) throw uploadError;

      const { publicURL, error: urlError } = supabase.storage
        .from("student-files")
        .getPublicUrl(fileName);

      if (urlError) throw urlError;

      file_url = publicURL;

      fs.unlinkSync(filePath);

      // Delete old file if exists
      if (certificate.file_url) {
        try {
          const oldFileName = certificate.file_url.split("/").pop();
          await supabase.storage.from("student-files").remove([oldFileName]);
        } catch (err) {
          console.warn("Failed to delete old file from Supabase:", err.message);
        }
      }
    }

    const result = await pool.query(
      `UPDATE certificates
       SET title=$1, description=$2, file_url=$3
       WHERE id=$4 RETURNING *`,
      [title, description, file_url, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update certificate error:", err.message);
    res.status(500).json({ msg: err.message });
  }
};

// -------------------------
// DELETE Certificate
// -------------------------
const revokeCertificate = async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      "SELECT * FROM certificates WHERE id=$1",
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ msg: "Certificate not found" });

    const certificate = rows[0];

    if (certificate.file_url) {
      try {
        const fileName = certificate.file_url.split("/").pop();
        const { error } = await supabase.storage
          .from("student-files")
          .remove([fileName]);
        if (error) console.warn("Failed to delete file:", error.message);
      } catch (err) {
        console.warn("Error deleting file from Supabase:", err.message);
      }
    }

    await pool.query("DELETE FROM certificates WHERE id=$1", [id]);

    res.json({ msg: "Certificate deleted successfully" });
  } catch (err) {
    console.error("Revoke certificate error:", err.message);
    res.status(500).json({ msg: err.message });
  }
};

module.exports = {
  getCertificates,
  issueCertificate,
  updateCertificate,
  revokeCertificate,
};
