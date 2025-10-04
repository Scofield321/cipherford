const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const {
  getBadges,
  awardBadge,
  updateBadge,
  removeBadge,
} = require("../../controllers/badgesController");

// 🏷️ Configure Multer for badge image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/badges");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + file.fieldname + ext;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });
// this is just for testing
// 📌 ROUTES

// Get all badges for a student
router.get("/:student_id", auth, getBadges);

// Award new badge (with file upload)
router.post("/", auth, upload.single("file"), (req, res) => {
  const { student_id, title, description } = req.body;
  const file_url = `/uploads/badges/${req.file.filename}`;

  // Attach to req.body so awardBadge controller can use it
  req.body.file_url = file_url;
  req.body.title = title;
  req.body.description = description;
  req.body.student_id = student_id;

  return awardBadge(req, res);
});

// Update badge (text or file logic can be added later)
router.put("/:id", auth, updateBadge);

// Delete badge
router.delete("/:id", auth, removeBadge);

module.exports = router;
