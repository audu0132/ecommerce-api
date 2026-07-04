/**
 * src/routes/product.routes.js — Product Routes
 *
 * GET    /api/products                        — List products (public, paginated)
 * GET    /api/products/:id                    — Get single product (public)
 * POST   /api/products                        — Create product (admin)
 * PATCH  /api/products/:id                    — Update product (admin)
 * DELETE /api/products/:id                    — Soft-delete product (admin)
 * POST   /api/products/:id/reviews            — Add review (authenticated)
 * DELETE /api/products/:id/reviews/:reviewId  — Delete review (owner or admin)
 */

'use strict';

const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');
const { protect } = require('../middleware/auth.middleware');
const { adminOnly } = require('../middleware/admin.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  createProductValidator,
  updateProductValidator,
  productQueryValidator,
  reviewValidator,
} = require('../validators/product.validator');

// ─── Public Routes ────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: List all products with filtering, sorting and pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [price, -price, rating, -rating, createdAt, -createdAt]
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of products
 */
router.get('/', productQueryValidator, validate, productController.getProducts);

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a single product by ID (includes reviews)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product found
 *       404:
 *         description: Product not found
 */
router.get('/:id', productController.getProduct);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product (admin only)
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  protect,
  adminOnly,
  createProductValidator,
  validate,
  productController.createProduct
);

/**
 * @openapi
 * /api/products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Update a product (admin only)
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:id',
  protect,
  adminOnly,
  updateProductValidator,
  validate,
  productController.updateProduct
);

/**
 * @openapi
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Soft-delete a product (admin only)
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', protect, adminOnly, productController.deleteProduct);

// ─── Review Routes (Authenticated) ───────────────────────────────────────────

/**
 * @openapi
 * /api/products/{id}/reviews:
 *   post:
 *     tags: [Products]
 *     summary: Add a review to a product (authenticated, one per user)
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/reviews',
  protect,
  reviewValidator,
  validate,
  productController.addReview
);

/**
 * @openapi
 * /api/products/{id}/reviews/{reviewId}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a review (owner or admin)
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id/reviews/:reviewId', protect, productController.deleteReview);

module.exports = router;
