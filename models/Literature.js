import mongoose from "mongoose";

const literatureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Draft", "Published", "Archived"],
      default: "Draft",
    },
    fileUrl: { type: String, required: true }, // full Supabase URL
    fileName: { type: String, default: "" },
    fileSize: { type: Number, default: 0 }, // bytes
    fileType: { type: String, default: "PDF" },
    downloadCount: { type: Number, default: 0 },
    publishedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Literature", literatureSchema);