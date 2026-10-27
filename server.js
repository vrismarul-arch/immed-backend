import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";

import connectDB from "./config/db.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import growthSnapshotRoutes from "./routes/growthSnapshotRoutes.js";
import literatureRoutes from "./routes/literatureRoutes.js"; // NEW
import authRoutes from "./routes/authRoutes.js"; // NEW
import userRoutes from "./routes/userRoutes.js"; // NEW

dotenv.config();

connectDB();

const app = express();

// CORS
app.use(cors());

// Body parsing middleware — MUST come before routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use("/uploads", express.static("uploads"));

// ROUTES
app.use("/api/services", serviceRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/growth-snapshot", growthSnapshotRoutes);
app.use("/api/literature", literatureRoutes); // NEW
app.use("/api/auth", authRoutes); // NEW
app.use("/api/users", userRoutes); // NEW

// Test route
app.get("/", (req, res) => {
  res.send("API Running");
});

// ==================== ERROR HANDLING MIDDLEWARE ====================
app.use((err, req, res, next) => {
  console.error("Global error:", err);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. Max size is 5MB for images, 20MB for PDFs",
    });
  }

  if (
    err.message === "Only image files are allowed" ||
    err.message === "Only PDF files are allowed"
  ) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  res.status(500).json({
    success: false,
    message: err.message || "Something went wrong!",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});