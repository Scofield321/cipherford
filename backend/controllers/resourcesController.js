const pool = require("../config/db");
const supabase = require("../config/superbase");
const fs = require("fs");

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
    res.status(500).json({ msg: "Server error" });
  }
};

const createResource = async (req, res) => {
  const { student_id, resource_name } = req.body;

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ msg: "Only admins can upload resources" });
  }

  let file_url = null;

  try {
    if (req.file) {
      const filePath = req.file.path;
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const fileData = fs.readFileSync(filePath);

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
    }

    const result = await pool.query(
      `INSERT INTO resources (student_id, resource_name, file_url)
       VALUES ($1, $2, $3) RETURNING *`,
      [student_id, resource_name, file_url]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create resource error:", err.message);
    res.status(500).json({ msg: err.message });
  }
};

const updateResource = async (req, res) => {
  const { id } = req.params;
  const { resource_name } = req.body;

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ msg: "Only admins can update resources" });
  }

  try {
    const { rows } = await pool.query("SELECT * FROM resources WHERE id=$1", [
      id,
    ]);
    if (!rows.length)
      return res.status(404).json({ msg: "Resource not found" });

    const resource = rows[0];
    let file_url = resource.file_url;

    if (req.file) {
      const filePath = req.file.path;
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const fileData = fs.readFileSync(filePath);

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

      if (resource.file_url) {
        const oldFile = resource.file_url.split("/").pop();
        await supabase.storage.from("student-files").remove([oldFile]);
      }
    }

    const result = await pool.query(
      `UPDATE resources SET resource_name=$1, file_url=$2
       WHERE id=$3 RETURNING *`,
      [resource_name, file_url, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update resource error:", err.message);
    res.status(500).json({ msg: err.message });
  }
};

const deleteResource = async (req, res) => {
  const { id } = req.params;

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ msg: "Only admins can delete resources" });
  }

  try {
    const { rows } = await pool.query("SELECT * FROM resources WHERE id=$1", [
      id,
    ]);
    if (!rows.length)
      return res.status(404).json({ msg: "Resource not found" });

    const resource = rows[0];

    if (resource.file_url) {
      const fileName = resource.file_url.split("/").pop();
      await supabase.storage.from("student-files").remove([fileName]);
    }

    await pool.query("DELETE FROM resources WHERE id=$1", [id]);
    res.json({ msg: "Resource deleted successfully" });
  } catch (err) {
    console.error("Delete resource error:", err.message);
    res.status(500).json({ msg: err.message });
  }
};

module.exports = {
  getResources,
  createResource,
  updateResource,
  deleteResource,
};
