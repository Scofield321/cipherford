const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} = require("../../controllers/projectsController");

router.get("/:student_id", auth, getProjects);
router.post("/", auth, createProject);
router.put("/:id", auth, updateProject);
router.delete("/:id", auth, deleteProject);

module.exports = router;
// this is just for testing
