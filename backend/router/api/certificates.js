const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const { uploadCertificate } = require("../../middleware/upload");

const {
  getCertificates,
  issueCertificate,
  updateCertificate,
  revokeCertificate,
} = require("../../controllers/certificatesController");

router.get("/:student_id", auth, getCertificates);

// ✅ Add multer middleware here
router.post("/", auth, uploadCertificate.single("file"), issueCertificate);

router.put("/:id", auth, updateCertificate);
router.delete("/:id", auth, revokeCertificate);

module.exports = router;
