const express = require("express");
const router = express.Router();
const {
  getAdminDashboardStats,
} = require("../../controllers/dashboardController");
const { auth } = require("../../middleware/auth");

router.get("/stats", auth, getAdminDashboardStats);

module.exports = router;
// this is just for testing
