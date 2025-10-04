const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const {
  getAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
} = require("../../controllers/attendanceController");

router.get("/:student_id", auth, getAttendance);
router.post("/", auth, createAttendance);
router.put("/:id", auth, updateAttendance);
router.delete("/:id", auth, deleteAttendance);

module.exports = router;
// this is just for testing
