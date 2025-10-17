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
  approvePost,
  rejectPost,
} = require("../../controllers/qaController");

// Fetch posts, optional query params: ?type=question|challenge&status=pending|approved|rejected
router.get("/posts", auth, allQuestionsAndAnswers);

router.post("/posts", auth, createQuestions);
router.delete("/posts/:postId", auth, deletePost);

// Admin-specific routes
router.get("/posts/admin", auth, adminPosts);
router.put("/posts/:postId/approve", auth, approvePost);
router.put("/posts/:postId/reject", auth, rejectPost);

// Answers routes
router.post("/answers", auth, answers);
router.get("/answers/:postId", auth, answersOfAparticularQuestion);

module.exports = router;
