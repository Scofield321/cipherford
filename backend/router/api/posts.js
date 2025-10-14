const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const {
  getPostsByType,
  createPost,
  updatePost,
  deletePost,
  getAllPosts,
} = require("../../controllers/postsController");

// -------------------------
// Routes
// -------------------------

// Get posts (optionally filter by type with ?type=challenge or ?type=question)
router.get("/", auth, getPostsByType);
router.get("/all", auth, getAllPosts);
router.post("/", auth, createPost);
router.put("/:id", auth, updatePost);
router.delete("/:id", auth, deletePost);

module.exports = router;
