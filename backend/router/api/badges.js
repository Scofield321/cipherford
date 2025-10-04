const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const { uploadBadge } = require("../../middleware/upload"); // make sure you have a separate multer setup for badges

const {
  getBadges,
  awardBadge,
  updateBadge,
  removeBadge,
} = require("../../controllers/badgesController");
t;
router.get("/:student_id", auth, getBadges);
router.post("/", auth, uploadBadge.single("file"), awardBadge);
router.put("/:id", auth, updateBadge);
router.delete("/:id", auth, removeBadge);
module.exports = router;
