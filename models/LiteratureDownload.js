import mongoose from "mongoose";

// One document per download = who downloaded which literature
const literatureDownloadSchema = new mongoose.Schema(
  {
    literature: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Literature",
      required: true,
      index: true,
    },
    literatureTitle: String, // snapshot, stays even if literature is deleted
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    institution: { type: String, required: true, trim: true },
    role: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("LiteratureDownload", literatureDownloadSchema);