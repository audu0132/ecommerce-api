/**
 * src/controllers/order.controller.js — Order Controllers
 *
 * Handlers:
 *  - createOrder       : Customer — convert cart → order, decrement stock
 *  - getMyOrders       : Customer — paginated list of own orders
 *  - getOrder          : Customer (own) or Admin — single order
 *  - cancelOrder       : Customer — cancel if still pending/processing
 *  - getAllOrders       : Admin — paginated list of all orders
 *  - updateOrderStatus : Admin — change status + append to history
 */

'use strict';

const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendPaginated,
} = require('../utils/apiResponse');

// ─── POST /api/orders ─────────────────────────────────────────────────────────
exports.createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod, notes } = req.body;

  // 1. Get user's cart
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    'items.product',
    'title images price stock isActive'
  );

  if (!cart || cart.items.length === 0) {
    return sendError(res, 400, 'Your cart is empty. Add items before placing an order.');
  }

  // 2. Validate all items are still available & have sufficient stock
  const stockErrors = [];
  for (const item of cart.items) {
    const product = item.product;

    if (!product || !product.isActive) {
      stockErrors.push(`Product "${product?.title || 'Unknown'}" is no longer available.`);
      continue;
    }

    if (product.stock < item.quantity) {
      stockErrors.push(
        `Insufficient stock for "${product.title}". Requested: ${item.quantity}, Available: ${product.stock}`
      );
    }
  }

  if (stockErrors.length > 0) {
    return sendError(res, 400, 'Some items in your cart have stock issues.', stockErrors);
  }

  // 3. Build order items snapshot (denormalized — price locked at time of order)
  const orderItems = cart.items.map((item) => ({
    product: item.product._id,
    title: item.product.title,
    image: item.product.images?.[0] || '',
    quantity: item.quantity,
    price: item.price, // price at time of add-to-cart
  }));

  const totalAmount = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // 4. Create order
  const order = await Order.create({
    user: req.user._id,
    products: orderItems,
    shippingAddress,
    paymentMethod,
    totalAmount: Math.round(totalAmount * 100) / 100,
    notes,
    statusHistory: [
      {
        status: 'pending',
        changedBy: req.user._id,
        note: 'Order placed by customer',
        changedAt: new Date(),
      },
    ],
  });

  // 5. Simulate payment (mark as paid, move to processing)
  order.simulatePayment(true);

  // Add payment confirmation to status history
  order.statusHistory.push({
    status: 'processing',
    changedBy: req.user._id,
    note: `Payment confirmed via ${paymentMethod}`,
    changedAt: new Date(),
  });

  await order.save();

  // 6. Decrement stock for each product (atomic-safe with individual saves)
  await Promise.all(
    cart.items.map((item) =>
      Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity },
      })
    )
  );

  // 7. Clear the cart
  cart.clearCart();
  await cart.save();

  return sendCreated(res, 'Order placed successfully.', { order });
});

// ─── GET /api/orders/my-orders ────────────────────────────────────────────────
exports.getMyOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const filter = { user: req.user._id };
  if (req.query.status) filter.orderStatus = req.query.status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-statusHistory'), // keep list lightweight
    Order.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Orders retrieved successfully.', orders, {
    total,
    page,
    limit,
  });
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    'products.product',
    'title images'
  );

  if (!order) return sendNotFound(res, 'Order');

  // Customers can only view their own orders
  const isAdmin = req.user.role === 'admin';
  const isOwner = order.user.toString() === req.user._id.toString();

  if (!isAdmin && !isOwner) {
    return sendError(res, 403, 'You are not authorized to view this order.');
  }

  return sendSuccess(res, 200, 'Order retrieved successfully.', { order });
});

// ─── PATCH /api/orders/:id/cancel ─────────────────────────────────────────────
exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return sendNotFound(res, 'Order');

  // Only allow owner to cancel their own order
  if (order.user.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'You are not authorized to cancel this order.');
  }

  // Only cancellable if still pending or processing
  if (!['pending', 'processing'].includes(order.orderStatus)) {
    return sendError(
      res,
      400,
      `Orders with status "${order.orderStatus}" cannot be cancelled.`
    );
  }

  const { cancellationReason } = req.body;

  // Update status via model method (appends to history)
  order.updateStatus('cancelled', req.user._id, cancellationReason || 'Cancelled by customer');
  order.cancellationReason = cancellationReason || '';

  // Refund if payment was already taken
  if (order.paymentStatus === 'paid') {
    order.paymentStatus = 'refunded';
  }

  await order.save();

  // Restore stock
  await Promise.all(
    order.products.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      })
    )
  );

  return sendSuccess(res, 200, 'Order cancelled successfully.', { order });
});

// ─── GET /api/orders (Admin) ──────────────────────────────────────────────────
exports.getAllOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.orderStatus = req.query.status;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.userId) filter.user = req.query.userId;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-statusHistory'),
    Order.countDocuments(filter),
  ]);

  return sendPaginated(res, 'All orders retrieved successfully.', orders, {
    total,
    page,
    limit,
  });
});

// ─── PATCH /api/orders/:id/status (Admin) ────────────────────────────────────
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus, note } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) return sendNotFound(res, 'Order');

  // Prevent invalid transitions
  const validTransitions = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  };

  const allowed = validTransitions[order.orderStatus];
  if (!allowed.includes(orderStatus)) {
    return sendError(
      res,
      400,
      `Cannot transition order from "${order.orderStatus}" to "${orderStatus}". ` +
        `Allowed transitions: ${allowed.join(', ') || 'none'}`
    );
  }

  // Use model method (sets timestamps + appends history)
  order.updateStatus(orderStatus, req.user._id, note || `Status updated to ${orderStatus} by admin`);

  await order.save();

  return sendSuccess(res, 200, 'Order status updated successfully.', { order });
});
