const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const {
  registerUser,
  loginUser,
  createAdmin,
} = require("../../controllers/authController");

router.post("/register", upload.none(), registerUser);
router.post("/login", loginUser);
router.post("/create-admin", createAdmin);

module.exports = router;
