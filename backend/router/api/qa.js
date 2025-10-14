const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");

const {
  allQuestionsAndAnswers,
  answers,
  answersOfAparticularQuestion,
  createQuestions,
  adminPosts,
  deletePost,
} = require("../../controllers/qaController");

router.get("/posts", auth, allQuestionsAndAnswers); // expects ?type=qa or ?type=challenge
router.post("/posts", auth, createQuestions);
router.delete("/posts/:postId", auth, deletePost);

router.get("/posts/admin", auth, adminPosts);

router.post("/answers", auth, answers);
router.get("/answers/:postId", auth, answersOfAparticularQuestion);

module.exports = router;
