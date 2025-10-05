const pool = require("../config/db");
const supabase = require("../config/superbase");
// const path = require("path");
const fs = require("fs");
const SOCKET_URL = "https://cipherford.onrender.com";
// Get all certificates for a student
const getCertificates = async (req, res) => {
  const { student_id } = req.params;

  if (!student_id) {
    return res.status(400).json({ msg: "student_id is required" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT * FROM certificates WHERE student_id=$1",
      [student_id]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ msg: "No certificates found for this student" });
    }

    res.json(rows);
  } catch (err) {
    console.error("Get certificates error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// Issue new Certificate
// const issueCertificate = async (req, res) => {
//   console.log("🛠 Incoming request body:", req.body);
//   console.log("🛠 Incoming file info:", req.file);

//   const { student_id, title, description } = req.body;

//   const file_url = req.file
//     ? `${SOCKET_URL}/uploads/certificates/${req.file.filename}`
//     : null;

//   // Restrict to admin only
//   if (!req.user) {
//     console.log("❌ No user info in request");
//     return res.status(401).json({ msg: "User not authenticated" });
//   }

//   if (req.user.role !== "admin") {
//     console.log("❌ Unauthorized user role:", req.user.role);
//     return res.status(403).json({ msg: "Only admins can issue certificates" });
//   }

//   try {
//     const result = await pool.query(
//       `INSERT INTO certificates (student_id, title, description, file_url)
//        VALUES ($1, $2, $3, $4) RETURNING *`,
//       [student_id, title, description, file_url]
//     );

//     console.log("✅ Insert result:", result.rows[0]);
//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error("Issue certificate error:", err.message);
//     res.status(500).send("Server error");
//   }
// };;

const issueCertificate = async (req, res) => {
  const { student_id, title, description } = req.body;

  // Restrict to admin only
  if (!req.user) return res.status(401).json({ msg: "User not authenticated" });
  if (req.user.role !== "admin")
    return res.status(403).json({ msg: "Only admins can issue certificates" });

  let file_url = null;

  try {
    if (req.file) {
      const filePath = req.file.path; // Local temp path
      const fileName = `${Date.now()}-${req.file.originalname}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from("student-files")
        .upload(fileName, fs.createReadStream(filePath), {
          cacheControl: "3600",
          upsert: false,
          contentType: "application/pdf",
        });

      if (error) throw error;

      // Get public URL (v1 uses publicURL)
      const { publicURL } = supabase.storage
        .from("student-files")
        .getPublicUrl(fileName);

      file_url = publicURL;

      // Delete local temp file
      fs.unlinkSync(filePath);
    }

    // Save certificate record in PostgreSQL
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

// testing issues

// const updateCertificate = async (req, res) => {
//   const { id } = req.params;
//   const { title, description, file_url } = req.body;

//   // Only admin can update certificates
//   if (req.user.role !== "admin") {
//     return res.status(403).json({ msg: "Only admins can update certificates" });
//   }

//   try {
//     const result = await pool.query(
//       `UPDATE certificates
//        SET title = $1, description = $2, file_url = $3
//        WHERE id = $4
//        RETURNING *`,
//       [title, description, file_url, id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ msg: "Certificate not found" });
//     }

//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error("Update certificate error:", err.message);
//     res.status(500).send("Server error");
//   }
// };

const updateCertificate = async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  // Only admin can update certificates
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ msg: "Only admins can update certificates" });
  }

  try {
    // 1️⃣ Fetch existing certificate
    const { rows } = await pool.query(
      "SELECT * FROM certificates WHERE id=$1",
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ msg: "Certificate not found" });

    const certificate = rows[0];
    let file_url = certificate.file_url; // Keep old URL by default

    // 2️⃣ Handle new file upload
    if (req.file) {
      const filePath = req.file.path;
      const fileName = `${Date.now()}-${req.file.originalname}`;

      // Upload new file to Supabase
      const { error: uploadError } = await supabase.storage
        .from("student-files")
        .upload(fileName, fs.createReadStream(filePath), {
          cacheControl: "3600",
          upsert: false,
          contentType: "application/pdf",
        });
      if (uploadError) throw uploadError;

      // Get public URL for the new file
      const { publicURL } = supabase.storage
        .from("student-files")
        .getPublicUrl(fileName);
      file_url = publicURL;

      // Delete local temp file safely
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn("Failed to delete local temp file:", err.message);
      }

      // Delete old file from Supabase if exists
      if (certificate.file_url) {
        try {
          const oldFileName = certificate.file_url
            .split("/")
            .pop()
            .split("?")[0];
          await supabase.storage.from("student-files").remove([oldFileName]);
        } catch (err) {
          console.warn("Failed to delete old file from Supabase:", err.message);
        }
      }
    }

    // 3️⃣ Update DB record
    const result = await pool.query(
      `UPDATE certificates
       SET title=$1, description=$2, file_url=$3
       WHERE id=$4
       RETURNING *`,
      [title, description, file_url, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update certificate error:", err.message);
    res.status(500).json({ msg: err.message });
  }
};

// Delete Certificate
// const revokeCertificate = async (req, res) => {
//   const { id } = req.params;
//   try {
//     await pool.query("DELETE FROM certificates WHERE id=$1", [id]);
//     res.json({ msg: "Certificate deleted" });
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send("Server error");
//   }
// };

const revokeCertificate = async (req, res) => {
  const { id } = req.params;

  // Only admin can revoke certificates
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ msg: "Only admins can revoke certificates" });
  }

  try {
    // 1️⃣ Get existing certificate
    const { rows } = await pool.query(
      "SELECT * FROM certificates WHERE id=$1",
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ msg: "Certificate not found" });

    const certificate = rows[0];

    // 2️⃣ Delete the file from Supabase if it exists
    if (certificate.file_url) {
      try {
        const fileName = certificate.file_url.split("/").pop().split("?")[0]; // handle query params
        const { error } = await supabase.storage
          .from("student-files")
          .remove([fileName]);

        if (error)
          console.warn("Failed to delete file from Supabase:", error.message);
      } catch (err) {
        console.warn("Error deleting file from Supabase:", err.message);
      }
    }

    // 3️⃣ Delete the DB record
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
