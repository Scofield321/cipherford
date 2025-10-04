const express = require("express");
const router = express.Router();

// Mount sub-routers
router.use("/auth", require("./auth"));
router.use("/logout", require("./logout"));
router.use("/users", require("./users"));
router.use("/students", require("./students"));
router.use("/parents", require("./parents"));
router.use("/children", require("./children"));
router.use("/projects", require("./projects"));
router.use("/badges", require("./badges"));
router.use("/certificates", require("./certificates"));
router.use("/skills", require("./skills"));
router.use("/resources", require("./resources"));
router.use("/topics", require("./topics"));
router.use("/upcoming_sessions", require("./upcoming_sessions"));
router.use("/attendance", require("./attendance"));
router.use("/weekly_points", require("./weekly_points"));
router.use("/admin", require("./admin"));
router.use("/bookings", require("./bookings"));

// ✅ No catch-all here; 404 is handled in server.js

module.exports = router;
