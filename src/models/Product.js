/**
 * src/models/Product.js — Mongoose Product Model
 *
 * Schema Fields:
 *  - title, description, category, brand
 *  - images (array of URLs)
 *  - price, stock
 *  - rating (computed from reviews)
 *  - reviews[] (sub-documents: user, rating, comment)
 *  - isActive (soft delete)
 *  - createdAt (via timestamps)
 *
 * Features:
 *  - Full-text search index on title, description, category, brand
 *  - Compound index on category + price for efficient filtering
 *  - Rating auto-calculation on review add/remove
 */

'use strict';

const mongoose = require('mongoose');

// ─── Review Sub-Schema ────────────────────────────────────────────────────────
const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },

    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },

    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review comment cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true, // Adds createdAt to each review
  }
);

// ─── Rating Sub-Schema ────────────────────────────────────────────────────────
const ratingSchema = new mongoose.Schema(
  {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      set: (val) => Math.round(val * 10) / 10, // Round to 1 decimal (4.7, not 4.666...)
    },

    count: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

// ─── Product Schema ───────────────────────────────────────────────────────────
const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },

    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      lowercase: true, // Normalize for consistent filtering
    },

    brand: {
      type: String,
      trim: true,
      default: 'Generic',
    },

    images: {
      type: [String], // Array of image URLs
      default: [],
      validate: {
        validator: function (arr) {
          return arr.length <= 10; // Max 10 images per product
        },
        message: 'A product can have at most 10 images',
      },
    },

    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
      set: (val) => Math.round(val * 100) / 100, // Round to 2 decimal places
    },

    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be a whole number',
      },
    },

    rating: {
      type: ratingSchema,
      default: () => ({ average: 0, count: 0 }),
    },

    // ── Reviews (Bonus) ───────────────────────────────────────────────────
    reviews: {
      type: [reviewSchema],
      default: [],
    },

    // ── Soft Delete ───────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt

    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Full-text search across title, description, category, brand
productSchema.index(
  { title: 'text', description: 'text', category: 'text', brand: 'text' },
  { weights: { title: 10, category: 5, brand: 3, description: 1 } } // Title matches rank higher
);

// Compound index for common filter+sort queries (category + price)
productSchema.index({ category: 1, price: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'rating.average': -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isActive: 1 });

// ─── Virtual: inStock ─────────────────────────────────────────────────────────
productSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Recalculate rating average and count from the reviews array.
 * Call this after adding or removing a review.
 */
productSchema.methods.calculateRating = function () {
  if (this.reviews.length === 0) {
    this.rating.average = 0;
    this.rating.count = 0;
    return;
  }

  const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.rating.average = totalRating / this.reviews.length;
  this.rating.count = this.reviews.length;
};

/**
 * Check if a specific user has already reviewed this product.
 *
 * @param {string} userId - The user's ObjectId
 * @returns {boolean}
 */
productSchema.methods.hasUserReviewed = function (userId) {
  return this.reviews.some(
    (review) => review.user.toString() === userId.toString()
  );
};

// ─── Query Middleware ─────────────────────────────────────────────────────────

// Automatically exclude inactive (soft-deleted) products from all find queries
productSchema.pre(/^find/, function (next) {
  this.find({ isActive: { $ne: false } });
  next();
});

// ─── Compile & Export Model ───────────────────────────────────────────────────
const Product = mongoose.model('Product', productSchema);

module.exports = Product;
