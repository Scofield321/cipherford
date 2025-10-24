const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const gameMatchesController = require("../../controllers/gameMatchController");

// Create new match
router.post("/", auth, gameMatchesController.createMatch);
router.post("/join", auth, gameMatchesController.joinMatch);
router.get(
  "/match/:roomCode/questions",
  auth,
  gameMatchesController.getQuestionsForMatch
);
router.post("/submit-answer", auth, gameMatchesController.submitAnswer);
router.post("/finalize", auth, gameMatchesController.finalizeMatch);

module.exports = router;
