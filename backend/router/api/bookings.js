const express = require("express");
const router = express.Router();

const {
  sessionsBookingController,
} = require("../../controllers/sessionsBookingController");
router.post("/", sessionsBookingController);
module.exports = router;
