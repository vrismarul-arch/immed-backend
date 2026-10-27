import Category from "../models/Category.js";
import Blog from "../models/Blog.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// =========================
// HELPER: find (case-insensitive) or create a category
// Used by createBlog / updateBlog too
// =========================
export const ensureCategory = async (name) => {
  const clean = name?.trim();
  if (!clean) return null;

  const existing = await Category.findOne({
    name: new RegExp(`^${escapeRegex(clean)}$`, "i"),
  });

  return existing || Category.create({ name: clean });
};

// =========================
// ADMIN: GET ALL CATEGORIES (+ blog count)
// Includes categories already used by old blogs
// =========================
export const getAdminCategories = async (req, res) => {
  try {
    const [cats, counts] = await Promise.all([
      Category.find().sort({ name: 1 }),
      Blog.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
    ]);

    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    const names = new Set(cats.map((c) => c.name));
    counts.forEach((c) => c._id && names.add(c._id));

    const categories = [...names]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name, count: countMap[name] || 0 }));

    res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("Get admin categories error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// ADMIN: CREATE CATEGORY
// =========================
export const createCategory = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required" });
    }

    const category = await ensureCategory(name);
    res.status(201).json({ success: true, category });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// ADMIN: DELETE CATEGORY (only if no blog uses it)
// =========================
export const deleteCategory = async (req, res) => {
  try {
    const name = req.params.name;

    const used = await Blog.countDocuments({ category: name });
    if (used > 0) {
      return res.status(400).json({
        success: false,
        message: `${used} blog(s) still use this category`,
      });
    }

    await Category.deleteOne({ name });
    res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// PUBLIC: categories that have published blogs
// =========================
export const getPublicCategories = async (req, res) => {
  try {
    const counts = await Blog.aggregate([
      { $match: { status: "Published" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      categories: counts.map((c) => ({ name: c._id, count: c.count })),
    });
  } catch (error) {
    console.error("Get public categories error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};