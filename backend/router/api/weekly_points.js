const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const {
  getWeeklyPoints,
  createWeeklyPoint,
  updateWeeklyPoint,
  deleteWeeklyPoint,
} = require("../../controllers/weekly_pointsController");

router.get("/:student_id", auth, getWeeklyPoints);
router.post("/", auth, createWeeklyPoint);
router.put("/:id", auth, updateWeeklyPoint);
router.delete("/:id", auth, deleteWeeklyPoint);

module.exports = router;
// this is just for testing
