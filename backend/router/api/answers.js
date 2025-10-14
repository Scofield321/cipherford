const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const {
  submitAnswer,
  getAnswersForPost,
} = require("../../controllers/answersController");

router.post("/", auth, submitAnswer);
router.get("/:postId", auth, getAnswersForPost);

module.exports = router;
