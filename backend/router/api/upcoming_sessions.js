const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const {
  getSessions,
  createSession,
  updateSession,
  deleteSession,
} = require("../../controllers/upcoming_sessionsController");

router.get("/:student_id", auth, getSessions);
router.post("/", auth, createSession);
router.put("/:id", auth, updateSession);
router.delete("/:id", auth, deleteSession);

module.exports = router;
// this is just for testing
