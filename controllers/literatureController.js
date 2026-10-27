import Literature from "../models/Literature.js";
import LiteratureDownload from "../models/LiteratureDownload.js";
import { uploadToSupabase, deleteFromSupabase } from "../utils/uploadHelper.js";

const FOLDER = "literature-pdfs";

// ---------- ADMIN ----------

export const createLiterature = async (req, res) => {
  try {
    const { title, description, status } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: "Title and description are required" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "PDF file is required" });
    }
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ success: false, message: "Only PDF files are allowed" });
    }

    const fileUrl = await uploadToSupabase(req.file, FOLDER);
    if (!fileUrl) {
      return res.status(400).json({ success: false, message: "Failed to upload file to Supabase" });
    }

    const literature = await Literature.create({
      title,
      description,
      status: status || "Draft",
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      publishedAt: status === "Published" ? new Date() : undefined,
    });

    res.status(201).json({ success: true, literature, message: "Literature created" });
  } catch (error) {
    console.error("Create literature error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLiterature = async (req, res) => {
  try {
    const existing = await Literature.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Literature not found" });
    }

    const { title, description, status } = req.body;
    const update = {
      title: title || existing.title,
      description: description || existing.description,
      status: status || existing.status,
    };

    if (status === "Published" && existing.status !== "Published") {
      update.publishedAt = new Date();
    }

    // Replace file only if a new one was sent
    if (req.file) {
      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({ success: false, message: "Only PDF files are allowed" });
      }
      const fileUrl = await uploadToSupabase(req.file, FOLDER);
      if (!fileUrl) {
        return res.status(400).json({ success: false, message: "Failed to upload file to Supabase" });
      }
      if (existing.fileUrl) await deleteFromSupabase(existing.fileUrl);
      update.fileUrl = fileUrl;
      update.fileName = req.file.originalname;
      update.fileSize = req.file.size;
    }

    const literature = await Literature.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, literature, message: "Literature updated" });
  } catch (error) {
    console.error("Update literature error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllLiterature = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    const literature = await Literature.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, literature });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteLiterature = async (req, res) => {
  try {
    const item = await Literature.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Literature not found" });
    }
    if (item.fileUrl) await deleteFromSupabase(item.fileUrl);
    await Literature.findByIdAndDelete(req.params.id);
    // download history is kept on purpose (leads), snapshot title is stored
    res.status(200).json({ success: true, message: "Literature deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLiteratureStats = async (req, res) => {
  try {
    const [total, published, draft, totalDownloads] = await Promise.all([
      Literature.countDocuments(),
      Literature.countDocuments({ status: "Published" }),
      Literature.countDocuments({ status: "Draft" }),
      LiteratureDownload.countDocuments(),
    ]);
    res.status(200).json({ success: true, stats: { total, published, draft, totalDownloads } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Who downloaded a specific literature
export const getDownloadsByLiterature = async (req, res) => {
  try {
    const downloads = await LiteratureDownload.find({ literature: req.params.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, downloads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// All downloads across everything
export const getAllDownloads = async (req, res) => {
  try {
    const downloads = await LiteratureDownload.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, downloads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- PUBLIC ----------

// Only Published items. fileUrl is NOT sent here, so nobody can skip the form.
export const getPublicLiterature = async (req, res) => {
  try {
    const literature = await Literature.find({ status: "Published" })
      .sort({ publishedAt: -1, createdAt: -1 })
      .select("title description fileType fileSize createdAt");
    res.status(200).json({ success: true, literature });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// User submits form -> save details -> return file URL
export const recordDownload = async (req, res) => {
  try {
    const { name, phone, email, institution, role } = req.body;

    if (!name || !phone || !email || !institution) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const item = await Literature.findOne({ _id: req.params.id, status: "Published" });
    if (!item) {
      return res.status(404).json({ success: false, message: "Literature not available" });
    }

    await LiteratureDownload.create({
      literature: item._id,
      literatureTitle: item.title,
      name,
      phone,
      email,
      institution,
      role,
    });

    item.downloadCount = (item.downloadCount || 0) + 1;
    await item.save();

    res.status(200).json({ success: true, fileUrl: item.fileUrl, fileName: item.fileName });
  } catch (error) {
    console.error("Record download error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};