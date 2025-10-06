const pool = require("../config/db");
const supabase = require("../config/superbase");
const fs = require("fs");

// 🔽 Get all resources for a student
const getResources = async (req, res) => {
  const { student_id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM resources WHERE student_id=$1",
      [student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get resources error:", err.message);
    res.status(500).send("Server error");
  }
};

// 🔼 Create new Resource (PDF)
const createResource = async (req, res) => {
  const { student_id, resource_name } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: "Resource file is required" });
  }

  try {
    const filePath = req.file.path;
    const fileName = `${Date.now()}-${req.file.originalname}`;

    // Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from("student-files")
      .upload(fileName, fs.createReadStream(filePath), {
        cacheControl: "3600",
        upsert: false,
        contentType: "application/pdf",
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { publicUrl } = supabase.storage
      .from("student-files")
      .getPublicUrl(fileName);

    // Delete local temp file
    fs.unlinkSync(filePath);

    // Save to DB
    const result = await pool.query(
      `INSERT INTO resources (student_id, resource_name, file_url) 
       VALUES ($1, $2, $3) RETURNING *`,
      [student_id, resource_name, publicUrl]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create resource error:", err.message);
    res.status(500).send("Server error");
  }
};

// ✏️ Update resource record only (no file)
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
    console.error("Update resource error:", err.message);
    res.status(500).send("Server error");
  }
};

// ❌ Delete resource & remove from Supabase
const deleteResource = async (req, res) => {
  const { id } = req.params;

  try {
    // Get resource
    const { rows } = await pool.query("SELECT * FROM resources WHERE id=$1", [
      id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: "Resource not found" });
    }

    const resource = rows[0];

    // Delete file from Supabase
    if (resource.file_url) {
      try {
        const fileName = resource.file_url.split("/").pop();
        const { error } = await supabase.storage
          .from("student-files")
          .remove([fileName]);
        if (error)
          console.warn(
            "⚠️ Failed to delete resource from Supabase:",
            error.message
          );
      } catch (err) {
        console.warn("⚠️ Supabase deletion error:", err.message);
      }
    }

    // Delete DB record
    await pool.query("DELETE FROM resources WHERE id=$1", [id]);

    res.json({ msg: "Resource deleted" });
  } catch (err) {
    console.error("Delete resource error:", err.message);
    res.status(500).send("Server error");
  }
};

module.exports = {
  getResources,
  createResource,
  updateResource,
  deleteResource,
};
