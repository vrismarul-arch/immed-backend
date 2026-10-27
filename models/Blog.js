import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  excerpt: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
 category: {
      type: String,
      required: true,
      trim: true,
    },
  tags: [String],
  featuredImage: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Archived'],
    default: 'Draft',
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  views: {
    type: Number,
    default: 0,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  authorName: {
    type: String,
    default: 'Admin',
  },
  seoTitle: String,
  seoDescription: String,
  seoKeywords: [String],
  publishedAt: Date,
  comments: [{
    user: String,
    email: String,
    content: String,
    isApproved: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  likes: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// ⚠️ IMPORTANT: NO MIDDLEWARE FUNCTIONS HERE - THEY CAUSE THE ERROR
// Delete or comment out ANY code that has "pre" or "post" middleware

const Blog = mongoose.model('Blog', blogSchema);
export default Blog;