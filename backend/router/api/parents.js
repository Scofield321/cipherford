const express = require("express");
const router = express.Router();
const {
  getAllParents,
  getParent,
  deleteParent,
  updateParent,
} = require("../../controllers/parentController");

const { auth, adminAuth } = require("../../middleware/auth");

// ✅ Admin-only access
router.get("/", adminAuth, getAllParents);
router.delete("/:id", adminAuth, deleteParent);
router.put("/:id", adminAuth, updateParent);

// ✅ Authenticated parent or admin
router.get("/:id", auth, getParent);

module.exports = router;
// this is just for testing
