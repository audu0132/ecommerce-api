/**
 * src/validators/cart.validator.js — Cart Route Validators
 */

'use strict';

const { body, param } = require('express-validator');

// ─── Add to Cart Validator ────────────────────────────────────────────────────
const addToCartValidator = [
  body('productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Product ID must be a valid MongoDB ObjectId'),

  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 1, max: 100 }).withMessage('Quantity must be a whole number between 1 and 100'),
];

// ─── Update Cart Item Validator ───────────────────────────────────────────────
const updateCartItemValidator = [
  param('itemId')
    .isMongoId().withMessage('Item ID must be a valid MongoDB ObjectId'),

  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 1, max: 100 }).withMessage('Quantity must be a whole number between 1 and 100'),
];

module.exports = {
  addToCartValidator,
  updateCartItemValidator,
};
