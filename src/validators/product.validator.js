/**
 * src/validators/product.validator.js — Product Route Validators
 *
 * Validation chains for:
 *  - createProductValidator : required product fields
 *  - updateProductValidator : all optional (PATCH semantics)
 *  - productQueryValidator  : query param sanitization
 *  - reviewValidator        : rating + optional comment
 */

'use strict';

const { body, query } = require('express-validator');

// ─── Create Product Validator ─────────────────────────────────────────────────
const createProductValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Product title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),

  body('category')
    .trim()
    .notEmpty().withMessage('Product category is required')
    .isLength({ min: 2, max: 100 }).withMessage('Category must be between 2 and 100 characters'),

  body('brand')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Brand name cannot exceed 100 characters'),

  body('price')
    .notEmpty().withMessage('Product price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),

  body('stock')
    .notEmpty().withMessage('Stock quantity is required')
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative whole number'),

  body('images')
    .optional()
    .isArray({ max: 10 }).withMessage('A product can have at most 10 images')
    .custom((arr) => arr.every((url) => typeof url === 'string' && url.trim().length > 0))
    .withMessage('Each image must be a non-empty string URL'),
];

// ─── Update Product Validator (PATCH — all optional) ──────────────────────────
const updateProductValidator = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),

  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Category must be between 2 and 100 characters'),

  body('brand')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Brand name cannot exceed 100 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),

  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative whole number'),

  body('images')
    .optional()
    .isArray({ max: 10 }).withMessage('A product can have at most 10 images'),
];

// ─── Product Query Validator (GET /products) ──────────────────────────────────
const productQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum price must be a non-negative number')
    .toFloat(),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Maximum price must be a non-negative number')
    .toFloat(),

  query('sort')
    .optional()
    .isIn(['price', '-price', 'rating', '-rating', 'createdAt', '-createdAt'])
    .withMessage('Sort must be one of: price, -price, rating, -rating, createdAt, -createdAt'),

  query('category')
    .optional()
    .trim()
    .toLowerCase(),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Search query must be between 1 and 200 characters'),
];

// ─── Review Validator ─────────────────────────────────────────────────────────
const reviewValidator = [
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be a whole number between 1 and 5'),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),
];

module.exports = {
  createProductValidator,
  updateProductValidator,
  productQueryValidator,
  reviewValidator,
};
