const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { readDB, writeDB } = require("../utils/db");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => cb(null, `${uuidv4()}.pdf`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed."));
    }
    cb(null, true);
  },
}).single("file");

// Role is checked BEFORE the file is accepted.
exports.uploadMiddleware = (req, res, next) => {
  if (req.role !== "doctor") {
    return res.status(403).json({ message: "Only doctors can upload reports." });
  }
  upload(req, res, (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "File too large (max 5 MB)." : err.message;
      return res.status(400).json({ message: msg });
    }
    next();
  });
};

const isRealPdf = (filePath) => {
  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(4);
  fs.readSync(fd, buf, 0, 4, 0);
  fs.closeSync(fd);
  return buf.toString() === "%PDF";
};

exports.createReport = (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Please attach a PDF file." });
  const cleanup = () => fs.unlink(req.file.path, () => {});

  const { patientCode, title, date, notes } = req.body;
  if (!patientCode || !title || !date) {
    cleanup();
    return res.status(400).json({ message: "Patient ID, title and date are required." });
  }
  if (!isRealPdf(req.file.path)) {
    cleanup();
    return res.status(400).json({ message: "Invalid PDF file." });
  }

  const db = readDB();
  const patient = db.users.find((u) => u.role === "patient" && u.patientCode === patientCode.trim());
  const doctor = db.users.find((u) => u.id === req.userId);
  if (!patient) {
    cleanup();
    return res.status(404).json({ message: "No patient found with this ID." });
  }

  db.reports = db.reports || [];
  const report = {
    id: uuidv4(),
    patientId: patient.id,
    patientCode: patient.patientCode,
    patientName: patient.name,
    doctorId: req.userId,
    doctorName: doctor ? doctor.name : "Doctor",
    title,
    date,
    notes: notes || "",
    fileName: req.file.filename,
    originalName: req.file.originalname,
    createdAt: new Date().toISOString(),
  };
  db.reports.push(report);
  writeDB(db);
  return res.status(201).json({ report });
};

exports.getReports = (req, res) => {
  const db = readDB();
  const all = db.reports || [];
  let reports;

  if (req.role === "doctor") {
    const { patientCode } = req.query;
    if (!patientCode) return res.status(400).json({ message: "patientCode is required." });
    reports = all.filter((r) => r.patientCode === patientCode.trim());
  } else {
    reports = all.filter((r) => r.patientId === req.userId);
  }

  reports.sort((a, b) => new Date(b.date) - new Date(a.date));
  return res.json({ reports });
};

exports.getReportFile = (req, res) => {
  const db = readDB();
  const report = (db.reports || []).find((r) => r.id === req.params.id);
  if (!report) return res.status(404).json({ message: "Report not found." });

  const allowed = req.role === "doctor" || report.patientId === req.userId;
  if (!allowed) return res.status(403).json({ message: "Not allowed." });

  const filePath = path.join(UPLOAD_DIR, report.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File is no longer available." });
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="report.pdf"`);
  return res.sendFile(filePath);
};

exports.deleteReport = (req, res) => {
  const db = readDB();
  const report = (db.reports || []).find((r) => r.id === req.params.id);
  if (!report) return res.status(404).json({ message: "Report not found." });
  if (req.role !== "doctor" || report.doctorId !== req.userId) {
    return res.status(403).json({ message: "You can only delete reports you uploaded." });
  }

  db.reports = db.reports.filter((r) => r.id !== report.id);
  writeDB(db);
  fs.unlink(path.join(UPLOAD_DIR, report.fileName), () => {});
  return res.json({ message: "Report deleted." });
};