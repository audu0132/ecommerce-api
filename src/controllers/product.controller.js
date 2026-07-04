/**
 * src/controllers/product.controller.js — Product Controllers
 *
 * Handlers:
 *  - getProducts   : Public — paginated list with filters, sort, text search
 *  - getProduct    : Public — single product by ID
 *  - createProduct : Admin — create new product
 *  - updateProduct : Admin — partial update (PATCH)
 *  - deleteProduct : Admin — soft delete (isActive: false)
 *  - addReview     : Authenticated — add review (one per user)
 *  - deleteReview  : Admin or review owner — remove a review
 */

'use strict';

const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendPaginated,
} = require('../utils/apiResponse');

// ─── GET /api/products ────────────────────────────────────────────────────────
exports.getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = parseInt(process.env.DEFAULT_PAGE_SIZE) || 10,
    sort = '-createdAt',
    category,
    minPrice,
    maxPrice,
    search,
    brand,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(process.env.MAX_PAGE_SIZE) || 100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // ── Build Filter ───────────────────────────────────────────────────────────
  const filter = { isActive: { $ne: false } };

  if (category) filter.category = category.toLowerCase();
  if (brand) filter.brand = { $regex: brand, $options: 'i' };
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice !== undefined) filter.price.$lte = parseFloat(maxPrice);
  }

  // ── Text Search (uses MongoDB text index) ─────────────────────────────────
  if (search) {
    filter.$text = { $search: search };
  }

  // ── Sort ───────────────────────────────────────────────────────────────────
  const sortMap = {
    'price': { price: 1 },
    '-price': { price: -1 },
    'rating': { 'rating.average': 1 },
    '-rating': { 'rating.average': -1 },
    'createdAt': { createdAt: 1 },
    '-createdAt': { createdAt: -1 },
  };
  const sortQuery = sortMap[sort] || { createdAt: -1 };

  // ── Execute Query ──────────────────────────────────────────────────────────
  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sortQuery)
      .skip(skip)
      .limit(limitNum)
      .select('-reviews'), // exclude reviews from list for performance
    Product.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Products retrieved successfully.', products, {
    total,
    page: pageNum,
    limit: limitNum,
  });
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate({
    path: 'reviews.user',
    select: 'name',
  });

  if (!product) {
    return sendNotFound(res, 'Product');
  }

  return sendSuccess(res, 200, 'Product retrieved successfully.', { product });
});

// ─── POST /api/products (Admin) ───────────────────────────────────────────────
exports.createProduct = asyncHandler(async (req, res) => {
  const { title, description, category, brand, images, price, stock } = req.body;

  const product = await Product.create({
    title,
    description,
    category: category?.toLowerCase(),
    brand,
    images: images || [],
    price,
    stock,
  });

  return sendCreated(res, 'Product created successfully.', { product });
});

// ─── PATCH /api/products/:id (Admin) ──────────────────────────────────────────
exports.updateProduct = asyncHandler(async (req, res) => {
  const allowedFields = ['title', 'description', 'category', 'brand', 'images', 'price', 'stock'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Normalize category
  if (updates.category) updates.category = updates.category.toLowerCase();

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!product) {
    return sendNotFound(res, 'Product');
  }

  return sendSuccess(res, 200, 'Product updated successfully.', { product });
});

// ─── DELETE /api/products/:id (Admin — soft delete) ───────────────────────────
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!product) {
    return sendNotFound(res, 'Product');
  }

  return sendSuccess(res, 200, 'Product deleted successfully.');
});

// ─── POST /api/products/:id/reviews (Authenticated) ──────────────────────────
exports.addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const userId = req.user._id;

  const product = await Product.findById(req.params.id);
  if (!product) return sendNotFound(res, 'Product');

  // One review per user per product
  if (product.hasUserReviewed(userId)) {
    return sendError(res, 409, 'You have already reviewed this product.');
  }

  product.reviews.push({ user: userId, rating, comment });
  product.calculateRating();
  await product.save();

  return sendCreated(res, 'Review added successfully.', {
    rating: product.rating,
    review: product.reviews[product.reviews.length - 1],
  });
});

// ─── DELETE /api/products/:id/reviews/:reviewId ───────────────────────────────
exports.deleteReview = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return sendNotFound(res, 'Product');

  const review = product.reviews.id(req.params.reviewId);
  if (!review) return sendNotFound(res, 'Review');

  // Only allow admin or the review's owner to delete
  const isAdmin = req.user.role === 'admin';
  const isOwner = review.user.toString() === req.user._id.toString();

  if (!isAdmin && !isOwner) {
    return sendError(res, 403, 'You are not authorized to delete this review.');
  }

  review.deleteOne();
  product.calculateRating();
  await product.save();

  return sendSuccess(res, 200, 'Review deleted successfully.', {
    rating: product.rating,
  });
});
