  import Blog from "../models/Blog.js";
  import { uploadToSupabase, deleteFromSupabase } from "../utils/uploadHelper.js";
  import { ensureCategory } from "./categoryController.js";

  // Helper function to generate slug
  const generateSlug = (title) => {
    if (!title) return "";
    return title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // =========================
  // CREATE BLOG POST (WITH SUPABASE)
  // =========================
  export const createBlog = async (req, res) => {
    try {
      const {
        title,
        excerpt,
        content,
        category,
        tags,
        status,
        seoTitle,
        seoDescription,
        seoKeywords,
        isFeatured,
        authorName,
      } = req.body;

      if (!title || !excerpt || !content || !category) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      // Find or create the category (case-insensitive, keeps names consistent)
      const cat = await ensureCategory(category);
      if (!cat) {
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        });
      }

      // Generate unique slug
      let slug = generateSlug(title);
      let existingBlog = await Blog.findOne({ slug });
      let counter = 1;
      while (existingBlog) {
        slug = `${generateSlug(title)}-${counter}`;
        existingBlog = await Blog.findOne({ slug });
        counter++;
      }

      // Process tags
      let tagsArray = [];
      if (tags) {
        if (Array.isArray(tags)) {
          tagsArray = tags;
        } else if (typeof tags === "string") {
          tagsArray = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
        }
      }

      // Process SEO keywords
      let seoKeywordsArray = [];
      if (seoKeywords) {
        if (Array.isArray(seoKeywords)) {
          seoKeywordsArray = seoKeywords;
        } else if (typeof seoKeywords === "string") {
          seoKeywordsArray = seoKeywords.split(",").map((kw) => kw.trim()).filter(Boolean);
        }
      }

      const blogData = {
        title,
        slug,
        excerpt,
        content,
        category: cat.name,
        tags: tagsArray,
        status: status || "Draft",
        authorName: authorName || "Admin",
        seoTitle: seoTitle || title,
        seoDescription: seoDescription || excerpt,
        seoKeywords: seoKeywordsArray,
        isFeatured: isFeatured === "true" || isFeatured === true,
        views: 0,
        likes: 0,
        comments: [],
      };

      // Handle image upload to Supabase
      if (req.file) {
        const imageUrl = await uploadToSupabase(req.file, "blog-images");
        if (imageUrl) {
          blogData.featuredImage = imageUrl; // Store full Supabase URL
        } else {
          return res.status(400).json({
            success: false,
            message: "Failed to upload image to Supabase",
          });
        }
      }

      if (status === "Published") {
        blogData.publishedAt = new Date();
      }

      const blog = await Blog.create(blogData);

      res.status(201).json({
        success: true,
        blog,
        message: "Blog created successfully",
      });
    } catch (error) {
      console.error("Create blog error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  // =========================
  // UPDATE BLOG (WITH SUPABASE)
  // =========================
  export const updateBlog = async (req, res) => {
    try {
      const blogId = req.params.id;
      const {
        title,
        excerpt,
        content,
        category,
        tags,
        status,
        seoTitle,
        seoDescription,
        seoKeywords,
        isFeatured,
        authorName,
      } = req.body;

      // Find existing blog
      const existingBlog = await Blog.findById(blogId);
      if (!existingBlog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      // Find or create the category if a new one was sent
      let categoryName = existingBlog.category;
      if (category) {
        const cat = await ensureCategory(category);
        if (cat) categoryName = cat.name;
      }

      // Process tags
      let tagsArray = existingBlog.tags;
      if (tags !== undefined) {
        if (Array.isArray(tags)) {
          tagsArray = tags;
        } else if (typeof tags === "string") {
          tagsArray = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
        }
      }

      // Process SEO keywords
      let seoKeywordsArray = existingBlog.seoKeywords;
      if (seoKeywords !== undefined) {
        if (Array.isArray(seoKeywords)) {
          seoKeywordsArray = seoKeywords;
        } else if (typeof seoKeywords === "string") {
          seoKeywordsArray = seoKeywords.split(",").map((kw) => kw.trim()).filter(Boolean);
        }
      }

      // Prepare update data
      const updateData = {
        excerpt: excerpt || existingBlog.excerpt,
        content: content || existingBlog.content,
        category: categoryName,
        tags: tagsArray,
        status: status || existingBlog.status,
        seoTitle: seoTitle || existingBlog.seoTitle,
        seoDescription: seoDescription || existingBlog.seoDescription,
        seoKeywords: seoKeywordsArray,
        isFeatured:
          isFeatured !== undefined
            ? isFeatured === "true" || isFeatured === true
            : existingBlog.isFeatured,
        authorName: authorName || existingBlog.authorName,
      };

      // Update title and slug if changed
      if (title && title !== existingBlog.title) {
        updateData.title = title;
        let newSlug = generateSlug(title);
        const slugExists = await Blog.findOne({
          slug: newSlug,
          _id: { $ne: existingBlog._id },
        });
        if (slugExists) {
          newSlug = `${newSlug}-${Date.now()}`;
        }
        updateData.slug = newSlug;
      }

      // Handle image upload to Supabase
      if (req.file) {
        // Delete old image from Supabase
        if (existingBlog.featuredImage) {
          await deleteFromSupabase(existingBlog.featuredImage);
        }

        // Upload new image
        const imageUrl = await uploadToSupabase(req.file, "blog-images");
        if (imageUrl) {
          updateData.featuredImage = imageUrl;
        } else {
          return res.status(400).json({
            success: false,
            message: "Failed to upload image to Supabase",
          });
        }
      }

      // Handle publish date
      if (status === "Published" && existingBlog.status !== "Published") {
        updateData.publishedAt = new Date();
      }

      const updatedBlog = await Blog.findByIdAndUpdate(blogId, updateData, {
        new: true,
        runValidators: true,
      });

      res.status(200).json({
        success: true,
        blog: updatedBlog,
        message: "Blog updated successfully",
      });
    } catch (error) {
      console.error("Update blog error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  // =========================
  // GET ALL BLOGS (ADMIN)
  // =========================
  export const getAllBlogs = async (req, res) => {
    try {
      const { status, category, search } = req.query;

      const filter = {};

      if (status && status !== "all") filter.status = status;
      if (category && category !== "all") filter.category = category;

      if (search && search.trim()) {
        filter.$or = [
          { title: { $regex: search, $options: "i" } },
          { excerpt: { $regex: search, $options: "i" } },
        ];
      }

      const blogs = await Blog.find(filter).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        blogs,
      });
    } catch (error) {
      console.error("Error in getAllBlogs:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  // =========================
  // GET BLOG BY ID
  // =========================
  export const getBlogById = async (req, res) => {
    try {
      const blog = await Blog.findById(req.params.id);
      if (!blog) {
        return res.status(404).json({ success: false, message: "Blog not found" });
      }
      res.status(200).json({ success: true, blog });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  // =========================
  // DELETE BLOG (WITH SUPABASE CLEANUP)
  // =========================
  export const deleteBlog = async (req, res) => {
    try {
      const blog = await Blog.findById(req.params.id);
      if (!blog) {
        return res.status(404).json({ success: false, message: "Blog not found" });
      }

      // Delete image from Supabase
      if (blog.featuredImage) {
        await deleteFromSupabase(blog.featuredImage);
      }

      await Blog.findByIdAndDelete(req.params.id);
      res.status(200).json({ success: true, message: "Blog deleted successfully" });
    } catch (error) {
      console.error("Delete blog error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  // =========================
  // GET PUBLIC BLOGS
  // =========================
  export const getPublicBlogs = async (req, res) => {
    try {
      const { category, search, page = 1, limit = 9 } = req.query;

      const query = { status: "Published" };

      if (
        category &&
        category !== "all" &&
        category !== "null" &&
        category !== "undefined"
      ) {
        query.category = category;
      }

      if (search && search.trim()) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { excerpt: { $regex: search, $options: "i" } },
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const blogs = await Blog.find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      const total = await Blog.countDocuments(query);

      res.status(200).json({
        success: true,
        blogs,
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        total,
      });
    } catch (error) {
      console.error("Get public blogs error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  // =========================
  // GET BLOG BY SLUG (PUBLIC)
  // =========================
  export const getBlogBySlug = async (req, res) => {
    try {
      const { slug } = req.params;

      const blog = await Blog.findOne({ slug: slug, status: "Published" });

      if (!blog) {
        return res.status(404).json({
          success: false,
          message: `Blog with slug "${slug}" not found or not published`,
        });
      }

      // Increment views
      blog.views = (blog.views || 0) + 1;
      await blog.save();

      // Get related blogs
      const relatedBlogs = await Blog.find({
        category: blog.category,
        status: "Published",
        _id: { $ne: blog._id },
      })
        .limit(3)
        .select("title slug featuredImage excerpt createdAt");

      res.status(200).json({
        success: true,
        blog,
        relatedBlogs,
      });
    } catch (error) {
      console.error("Get blog by slug error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  // =========================
  // BULK ACTIONS (WITH SUPABASE CLEANUP)
  // =========================
  export const bulkAction = async (req, res) => {
    try {
      const { action, blogIds } = req.body;

      if (action === "delete") {
        // Delete associated images from Supabase
        const blogsToDelete = await Blog.find({ _id: { $in: blogIds } });
        for (const blog of blogsToDelete) {
          if (blog.featuredImage) {
            await deleteFromSupabase(blog.featuredImage);
          }
        }
        await Blog.deleteMany({ _id: { $in: blogIds } });
      } else if (action === "publish") {
        await Blog.updateMany(
          { _id: { $in: blogIds } },
          { status: "Published", publishedAt: new Date() }
        );
      } else if (action === "draft") {
        await Blog.updateMany({ _id: { $in: blogIds } }, { status: "Draft" });
      } else if (action === "archive") {
        await Blog.updateMany({ _id: { $in: blogIds } }, { status: "Archived" });
      } else if (action === "feature") {
        await Blog.updateMany({ _id: { $in: blogIds } }, { isFeatured: true });
      } else if (action === "unfeature") {
        await Blog.updateMany({ _id: { $in: blogIds } }, { isFeatured: false });
      }

      res.status(200).json({ success: true, message: "Bulk action completed" });
    } catch (error) {
      console.error("Bulk action error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  // =========================
  // GET STATISTICS
  // =========================
  export const getBlogStats = async (req, res) => {
    try {
      const total = await Blog.countDocuments();
      const published = await Blog.countDocuments({ status: "Published" });
      const draft = await Blog.countDocuments({ status: "Draft" });
      const archived = await Blog.countDocuments({ status: "Archived" });
      const featured = await Blog.countDocuments({ isFeatured: true });

      res.status(200).json({
        success: true,
        stats: { total, published, draft, archived, featured },
      });
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  // =========================
  // ADD COMMENT
  // =========================
  export const addComment = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, content } = req.body;

      if (!name || !content) {
        return res.status(400).json({
          success: false,
          message: "Name and comment are required",
        });
      }

      const blog = await Blog.findById(id);
      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      blog.comments.push({
        user: name,
        content: content,
        createdAt: new Date(),
        isApproved: false,
      });

      await blog.save();

      res.status(200).json({
        success: true,
        message: "Comment submitted successfully",
      });
    } catch (error) {
      console.error("Add comment error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  // =========================
  // TOGGLE LIKE
  // =========================
  export const toggleLike = async (req, res) => {
    try {
      const { id } = req.params;

      const blog = await Blog.findById(id);
      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      blog.likes = (blog.likes || 0) + 1;
      await blog.save();

      res.status(200).json({
        success: true,
        likes: blog.likes,
      });
    } catch (error) {
      console.error("Toggle like error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };