const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const { uploadResource } = require("../../middleware/upload"); // ✅ Import the middleware
const {
  getResources,
  createResource,
  updateResource,
  deleteResource,
} = require("../../controllers/resourcesController");

// Fetch resources for a student
router.get("/:student_id", auth, getResources);

// Create a new resource with file upload
router.post("/", auth, uploadResource.single("file"), createResource);

// Update a resource (optional: you may also add file upload here)
router.put("/:id", auth, updateResource);

// Delete a resource
router.delete("/:id", auth, deleteResource);

module.exports = router;
