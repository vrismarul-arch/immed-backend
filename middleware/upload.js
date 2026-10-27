// backend/middleware/upload.js

import multer from "multer";

/* =========================================
   STORAGE
========================================= */

const storage = multer.memoryStorage();

/* =========================================
   IMAGE FILTER
========================================= */

const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;

  const extname = allowedTypes.test(file.originalname.toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
  }
};

/* =========================================
   SERVICE IMAGE UPLOAD
========================================= */

const imageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 50,
  },
  fileFilter: imageFileFilter,
});

export const uploadServiceImages = imageUpload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "icon", maxCount: 1 },
  { name: "gallery", maxCount: 20 },
  { name: "galleryImages", maxCount: 20 },
  { name: "problemsWeSolveImages", maxCount: 20 },
  { name: "ourApproachImages", maxCount: 20 },
  { name: "keyBenefitsImages", maxCount: 20 },
]);

/* =========================================
   RESUME UPLOAD
========================================= */

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;

    const extname = allowedTypes.test(file.originalname.toLowerCase());

    const mimetype =
      file.mimetype.includes("pdf") ||
      file.mimetype.includes("word") ||
      file.mimetype.includes("officedocument");

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC and DOCX files are allowed"));
    }
  },
});

export const uploadResume = resumeUpload.single("resume");

/* =========================================
   LITERATURE PDF UPLOAD  (NEW)
========================================= */

const literatureUpload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" &&
      file.originalname.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

export const uploadLiteraturePdf = literatureUpload.single("file");