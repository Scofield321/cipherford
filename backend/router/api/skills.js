const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const {
  getSkills,
  unlockSkill,
  updateSkill,
  removeSkill,
} = require("../../controllers/skillsController");

router.get("/:student_id", auth, getSkills);
router.post("/", auth, unlockSkill);
router.put("/:id", auth, updateSkill);
router.delete("/:id", auth, removeSkill);

module.exports = router;
// this is just for testing
