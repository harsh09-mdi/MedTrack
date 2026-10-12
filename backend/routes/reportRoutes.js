const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/", reportController.getReports);
router.get("/:id/file", reportController.getReportFile);
router.post("/", reportController.uploadMiddleware, reportController.createReport);
router.delete("/:id", reportController.deleteReport);

module.exports = router;