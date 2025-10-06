const pool = require("../config/db");
const supabase = require("../config/superbase");
const fs = require("fs");

// Get all badges for a student
const getBadges = async (req, res) => {
  const { student_id } = req.params;

  if (req.user.id !== student_id && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM badges WHERE student_id=$1",
      [student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get badges error:", err.message);
    res.status(500).send("Server error");
  }
};

// Award new badge (PDF)
const awardBadge = async (req, res) => {
  const { student_id, title, description } = req.body;
  let file_url = null;

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ msg: "Only admins can award badges" });
  }

  try {
    if (req.file) {
      const filePath = req.file.path;
      const fileName = `${Date.now()}-${req.file.originalname}`;

      const { error: uploadError } = await supabase.storage
        .from("student-files")
        .upload(fileName, fs.createReadStream(filePath), {
          cacheControl: "3600",
          upsert: false,
          contentType: "application/pdf",
        });

      if (uploadError) throw uploadError;

      const { publicUrl } = supabase.storage
        .from("student-files")
        .getPublicUrl(fileName);

      file_url = publicUrl;

      fs.unlinkSync(filePath); // Clean up local
    }

    const result = await pool.query(
      `INSERT INTO badges (student_id, title, description, file_url) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [student_id, title, description, file_url]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Award badge error:", err.message);
    res.status(500).send("Server error");
  }
};

// Update badge
const updateBadge = async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ msg: "Only admins can update badges" });
  }

  try {
    const { rows } = await pool.query("SELECT * FROM badges WHERE id=$1", [id]);
    if (rows.length === 0)
      return res.status(404).json({ msg: "Badge not found" });

    const badge = rows[0];
    let file_url = badge.file_url;

    if (req.file) {
      const filePath = req.file.path;
      const fileName = `${Date.now()}-${req.file.originalname}`;

      const { error: uploadError } = await supabase.storage
        .from("student-files")
        .upload(fileName, fs.createReadStream(filePath), {
          cacheControl: "3600",
          upsert: false,
          contentType: "application/pdf",
        });

      if (uploadError) throw uploadError;

      const { publicUrl } = supabase.storage
        .from("student-files")
        .getPublicUrl(fileName);

      file_url = publicUrl;

      fs.unlinkSync(filePath);

      // Remove old badge file from Supabase
      if (badge.file_url) {
        try {
          const oldFileName = badge.file_url.split("/").pop();
          await supabase.storage.from("student-files").remove([oldFileName]);
        } catch (err) {
          console.warn("⚠️ Failed to delete old badge file:", err.message);
        }
      }
    }

    const result = await pool.query(
      `UPDATE badges
       SET title=$1, description=$2, file_url=$3
       WHERE id=$4
       RETURNING *`,
      [title, description, file_url, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update badge error:", err.message);
    res.status(500).send("Server error");
  }
};

// Delete badge
const removeBadge = async (req, res) => {
  const { id } = req.params;

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ msg: "Only admins can delete badges" });
  }

  try {
    const { rows } = await pool.query("SELECT * FROM badges WHERE id=$1", [id]);
    if (rows.length === 0)
      return res.status(404).json({ msg: "Badge not found" });

    const badge = rows[0];

    if (badge.file_url) {
      try {
        const fileName = badge.file_url.split("/").pop();
        await supabase.storage.from("student-files").remove([fileName]);
      } catch (err) {
        console.warn("⚠️ Failed to delete badge file:", err.message);
      }
    }

    await pool.query("DELETE FROM badges WHERE id=$1", [id]);

    res.json({ msg: "Badge deleted" });
  } catch (err) {
    console.error("Delete badge error:", err.message);
    res.status(500).send("Server error");
  }
};

module.exports = {
  getBadges,
  awardBadge,
  updateBadge,
  removeBadge,
};
