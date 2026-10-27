import express from "express";
// Auth imports: copy the exact names from your blogRoutes.js
import { uploadLiteraturePdf } from "../middleware/upload.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  createLiterature,
  updateLiterature,
  getAllLiterature,
  deleteLiterature,
  getLiteratureStats,
  getDownloadsByLiterature,
  getAllDownloads,
  getPublicLiterature,
  recordDownload,
} from "../controllers/literatureController.js";

const router = express.Router();

// ----- Admin (declare BEFORE "/:id" routes) -----
router.get("/admin", protect, adminOnly, getAllLiterature);
router.get("/admin/stats", protect, adminOnly, getLiteratureStats);
router.get("/admin/downloads", protect, adminOnly, getAllDownloads);
router.get("/admin/:id/downloads", protect, adminOnly, getDownloadsByLiterature);
router.post("/admin/create", protect, adminOnly, uploadLiteraturePdf, createLiterature);
router.put("/admin/:id", protect, adminOnly, uploadLiteraturePdf, updateLiterature);
router.delete("/admin/:id", protect, adminOnly, deleteLiterature);

// ----- Public -----
router.get("/", getPublicLiterature);
router.post("/:id/download", recordDownload);

export default router;

// In server.js:
// import literatureRoutes from "./routes/literatureRoutes.js";
// app.use("/api/literature", literatureRoutes);