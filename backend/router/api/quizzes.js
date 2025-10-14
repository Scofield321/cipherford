const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const {
  getAllQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  submitQuizAnswer,
} = require("../../controllers/quizzesController");

router.get("/", auth, getAllQuizzes);
router.get("/:id", auth, getQuizById);
router.post("/", auth, createQuiz);
router.put("/:id", auth, updateQuiz);
router.delete("/:id", auth, deleteQuiz);
// Submit quiz answer (logged-in users)
router.post("/submit", auth, submitQuizAnswer);
module.exports = router;
