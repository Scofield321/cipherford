const express = require("express");
const {
  addAnswerReaction,
  getAnswerReactions,
  deleteAnswerReaction,
  updateAnswerReaction,
} = require("../../controllers/answerReactionController.js");

const { auth } = require("../../middleware/auth");
const router = express.Router();

router.post("/:answerId", auth, addAnswerReaction);
router.get("/:answerId", auth, getAnswerReactions);
router.delete("/:reactionId", auth, deleteAnswerReaction);
router.put("/:reactionId", auth, updateAnswerReaction);

module.exports = router;
