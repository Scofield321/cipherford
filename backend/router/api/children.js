const express = require("express");
const router = express.Router();
const {
  getChildren,
  addChild,
  removeChild,
} = require("../../controllers/childrenController");
const { auth } = require("../../middleware/auth");

router.get("/:parent_id", auth, getChildren);
router.post("/", auth, addChild);
router.delete("/:child_id", auth, removeChild);

module.exports = router;
// this is just for testing
