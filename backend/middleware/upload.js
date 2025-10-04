const multer = require("multer");
const path = require("path");

const createStorage = (folder, allowedTypes) =>
  multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        // Save files relative to backend folder
        cb(null, path.join(__dirname, "../uploads", folder));
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      },
    }),
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.test(ext)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type"));
      }
    },
  });

// Export specific uploader
const uploadBadge = createStorage("badges", /\.(jpg|jpeg|png)$/);
const uploadCertificate = createStorage("certificates", /\.pdf$/);
const uploadResource = createStorage(
  "resources",
  /\.(pdf|doc|docx|ppt|pptx|xls|xlsx)$/i
); // ✅ New for resources

module.exports = {
  uploadBadge,
  uploadCertificate,
  uploadResource,
};
