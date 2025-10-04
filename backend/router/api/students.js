const express = require("express");
const router = express.Router();
const {
  getAllStudents,
  getStudent,
  updateStudentWithSessions,
  getStudentLeaderboard,
  deleteStudent,
} = require("../../controllers/studentController");

const { auth, adminAuth } = require("../../middleware/auth");

// -------------------------
// Routes
// -------------------------

// ✅ Leaderboard: Get all students sorted by points
router.get("/leaderboard", auth, getStudentLeaderboard);
// ✅ Admin-only: Get all students
router.get("/", adminAuth, getAllStudents);
// only admin to delete a student
router.delete("/:id", adminAuth, deleteStudent);

// ✅ Authenticated: Admin can update a student
router.put("/:id", adminAuth, updateStudentWithSessions);

// ✅ Authenticated: Student or Admin can view a specific student
router.get("/:id", auth, getStudent);

module.exports = router;
// this is just for testing
