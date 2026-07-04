/**
 * src/validators/order.validator.js — Order Route Validators
 */

'use strict';

const { body } = require('express-validator');

// ─── Create Order Validator ───────────────────────────────────────────────────
const createOrderValidator = [
  body('shippingAddress')
    .notEmpty().withMessage('Shipping address is required')
    .isObject().withMessage('Shipping address must be an object'),

  body('shippingAddress.street')
    .trim()
    .notEmpty().withMessage('Street address is required'),

  body('shippingAddress.city')
    .trim()
    .notEmpty().withMessage('City is required'),

  body('shippingAddress.country')
    .trim()
    .notEmpty().withMessage('Country is required'),

  body('shippingAddress.zipCode')
    .trim()
    .notEmpty().withMessage('Zip code is required'),

  body('shippingAddress.state')
    .optional()
    .trim(),

  body('paymentMethod')
    .notEmpty().withMessage('Payment method is required')
    .isIn(['credit_card', 'debit_card', 'paypal', 'cod'])
    .withMessage('Payment method must be one of: credit_card, debit_card, paypal, cod'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
];

// ─── Update Order Status Validator (Admin) ────────────────────────────────────
const updateOrderStatusValidator = [
  body('orderStatus')
    .notEmpty().withMessage('Order status is required')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Order status must be one of: pending, processing, shipped, delivered, cancelled'),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Note cannot exceed 500 characters'),
];

// ─── Cancel Order Validator ───────────────────────────────────────────────────
const cancelOrderValidator = [
  body('cancellationReason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Cancellation reason cannot exceed 500 characters'),
];

module.exports = {
  createOrderValidator,
  updateOrderStatusValidator,
  cancelOrderValidator,
};
