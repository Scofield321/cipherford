const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const {
  getTopics,
  createTopic,
  updateTopic,
  deleteTopic,
} = require("../../controllers/topicsController");

router.get("/:student_id", auth, getTopics);
router.post("/", auth, createTopic);
router.put("/:id", auth, updateTopic);
router.delete("/:id", auth, deleteTopic);

module.exports = router;
// this is just for testing
