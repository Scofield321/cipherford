const express = require("express");
const router = express.Router();
const {
  getAllQuizSets,
  getQuizSetById,
  createQuizSet,
  addQuestionToSet,
  deleteQuizSet,
  updateQuestion,
  deleteQuestion,
  getSetQuizzes,
  getRegularQuizzes,
} = require("../../controllers/quizSetController");
const { auth } = require("../../middleware/auth");

router.get("/", auth, getAllQuizSets);
router.get("/regular", auth, getRegularQuizzes);
router.get("/:set_id/quizzes", auth, getSetQuizzes); // <- before /:id
router.get("/:id", auth, getQuizSetById);
router.post("/", auth, createQuizSet);
router.post("/:set_id/quizzes", auth, addQuestionToSet);
router.delete("/:id", auth, deleteQuizSet);
router.put("/question/:id", auth, updateQuestion);
router.delete("/question/:id", auth, deleteQuestion);

module.exports = router;
