const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const studentCommunityController = require("../../controllers/studentCommunityController");

// Q&A routes
router.get("/posts", auth, studentCommunityController.getCommunityPosts);
router.post("/posts", auth, studentCommunityController.createStudentPost);
router.post("/answers", auth, studentCommunityController.submitAnswer);
router.get(
  "/posts/:postId/answers",
  auth,
  studentCommunityController.getAnswersForPost
);
// Leaderboard
router.get("/leaderboard", auth, studentCommunityController.getLeaderboard);
// Quizzes routes
router.get("/quizzes", auth, studentCommunityController.getQuizzes);
router.post("/quizzes/submit", auth, studentCommunityController.submitQuiz);
// Admin Posts
router.get("/admin-posts", auth, studentCommunityController.getAdminPosts);
router.post(
  "/reply/:commentId",
  auth,
  studentCommunityController.addCommentReply
);
// Edit an answer (only author or admin)
router.put("/answers/:answerId", auth, studentCommunityController.updateAnswer);
// Delete an answer (only author or admin)
router.delete(
  "/answers/:answerId",
  auth,
  studentCommunityController.deleteAnswer
);

// Edit a post (only author or admin)
router.put("/posts/:postId", auth, studentCommunityController.updatePost);
// Delete post (only author or admin)
router.delete("/posts/:postId", auth, studentCommunityController.deletePost);
module.exports = router;
