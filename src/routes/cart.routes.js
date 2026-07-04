/**
 * src/routes/cart.routes.js — Cart Routes (all protected)
 *
 * GET    /api/cart                — Get current user's cart
 * POST   /api/cart                — Add item to cart
 * PATCH  /api/cart/items/:itemId  — Update item quantity
 * DELETE /api/cart/items/:itemId  — Remove specific item
 * DELETE /api/cart                — Clear entire cart
 */

'use strict';

const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cart.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  addToCartValidator,
  updateCartItemValidator,
} = require('../validators/cart.validator');

// All cart routes require authentication
router.use(protect);

/**
 * @openapi
 * /api/cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get the current user's cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 */
router.get('/', cartController.getCart);

/**
 * @openapi
 * /api/cart:
 *   post:
 *     tags: [Cart]
 *     summary: Add a product to the cart (or increase quantity)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId:
 *                 type: string
 *                 example: 60d0fe4f5311236168a109ca
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 */
router.post('/', addToCartValidator, validate, cartController.addToCart);

/**
 * @openapi
 * /api/cart/items/{itemId}:
 *   patch:
 *     tags: [Cart]
 *     summary: Update the quantity of a cart item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 */
router.patch(
  '/items/:itemId',
  updateCartItemValidator,
  validate,
  cartController.updateCartItem
);

/**
 * @openapi
 * /api/cart/items/{itemId}:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove a specific item from the cart
 *     security:
 *       - bearerAuth: []
 */
router.delete('/items/:itemId', cartController.removeFromCart);

/**
 * @openapi
 * /api/cart:
 *   delete:
 *     tags: [Cart]
 *     summary: Clear all items from the cart
 *     security:
 *       - bearerAuth: []
 */
router.delete('/', cartController.clearCart);

module.exports = router;
