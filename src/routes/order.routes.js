/**
 * src/routes/order.routes.js — Order Routes
 *
 * POST   /api/orders               — Place order (customer)
 * GET    /api/orders/my-orders     — Get own orders (customer)
 * GET    /api/orders/:id           — Get single order (owner or admin)
 * PATCH  /api/orders/:id/cancel    — Cancel order (customer)
 * GET    /api/orders               — Get all orders (admin)
 * PATCH  /api/orders/:id/status    — Update order status (admin)
 *
 * IMPORTANT: Specific routes (my-orders) must come BEFORE parameterised (:id)
 */

'use strict';

const express = require('express');
const router = express.Router();

const orderController = require('../controllers/order.controller');
const { protect } = require('../middleware/auth.middleware');
const { adminOnly } = require('../middleware/admin.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  createOrderValidator,
  updateOrderStatusValidator,
  cancelOrderValidator,
} = require('../validators/order.validator');

// All order routes require authentication
router.use(protect);

/**
 * @openapi
 * /api/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Place an order from the current cart
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shippingAddress, paymentMethod]
 *             properties:
 *               shippingAddress:
 *                 type: object
 *                 properties:
 *                   street: { type: string }
 *                   city: { type: string }
 *                   state: { type: string }
 *                   country: { type: string }
 *                   zipCode: { type: string }
 *               paymentMethod:
 *                 type: string
 *                 enum: [credit_card, debit_card, paypal, cod]
 *               notes:
 *                 type: string
 */
router.post('/', createOrderValidator, validate, orderController.createOrder);

/**
 * @openapi
 * /api/orders/my-orders:
 *   get:
 *     tags: [Orders]
 *     summary: Get paginated list of the current user's orders
 *     security:
 *       - bearerAuth: []
 */
// NOTE: Must come before /:id to avoid "my-orders" being matched as an ObjectId
router.get('/my-orders', orderController.getMyOrders);

/**
 * @openapi
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: Get all orders (admin only)
 *     security:
 *       - bearerAuth: []
 */
router.get('/', adminOnly, orderController.getAllOrders);

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get a single order by ID (owner or admin)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', orderController.getOrder);

/**
 * @openapi
 * /api/orders/{id}/cancel:
 *   patch:
 *     tags: [Orders]
 *     summary: Cancel an order (customer, only if pending/processing)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/cancel', cancelOrderValidator, validate, orderController.cancelOrder);

/**
 * @openapi
 * /api/orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Update order status (admin only)
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:id/status',
  adminOnly,
  updateOrderStatusValidator,
  validate,
  orderController.updateOrderStatus
);

module.exports = router;
