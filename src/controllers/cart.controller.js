/**
 * src/controllers/cart.controller.js — Cart Controllers
 *
 * Handlers:
 *  - getCart        : Get current user's cart (populated)
 *  - addToCart      : Add product or increment quantity if already present
 *  - updateCartItem : Update quantity of a specific item by itemId
 *  - removeFromCart : Remove a specific item
 *  - clearCart      : Empty the entire cart
 *
 * All routes require authentication (protect middleware).
 */

'use strict';

const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
} = require('../utils/apiResponse');

// ─── Helper: Get or Create Cart for User ─────────────────────────────────────
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate({
    path: 'items.product',
    select: 'title images price stock isActive',
  });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  return cart;
};

// ─── GET /api/cart ────────────────────────────────────────────────────────────
exports.getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);

  return sendSuccess(res, 200, 'Cart retrieved successfully.', { cart });
});

// ─── POST /api/cart ───────────────────────────────────────────────────────────
exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  // 1. Validate product exists and is available
  const product = await Product.findById(productId);
  if (!product) return sendNotFound(res, 'Product');

  if (!product.isActive) {
    return sendError(res, 400, 'This product is no longer available.');
  }

  if (product.stock < quantity) {
    return sendError(
      res,
      400,
      `Insufficient stock. Only ${product.stock} unit(s) available.`
    );
  }

  // 2. Get or create the cart
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  // 3. Check if adding would exceed stock
  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId
  );
  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (newQuantity > product.stock) {
      return sendError(
        res,
        400,
        `Cannot add ${quantity} more. You already have ${existingItem.quantity} in cart and only ${product.stock} in stock.`
      );
    }
  }

  // 4. Use Cart model method to add / increment
  cart.addItem(productId, quantity, product.price);
  await cart.save();

  // 5. Return populated cart
  await cart.populate({
    path: 'items.product',
    select: 'title images price stock',
  });

  return sendCreated(res, 'Item added to cart successfully.', { cart });
});

// ─── PATCH /api/cart/items/:itemId ───────────────────────────────────────────
exports.updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return sendNotFound(res, 'Cart');

  const item = cart.items.id(itemId);
  if (!item) return sendNotFound(res, 'Cart item');

  // Validate against current stock
  const product = await Product.findById(item.product).select('stock isActive');
  if (!product || !product.isActive) {
    return sendError(res, 400, 'This product is no longer available.');
  }

  if (quantity > product.stock) {
    return sendError(res, 400, `Only ${product.stock} unit(s) available in stock.`);
  }

  const updated = cart.updateItemQuantity(itemId, quantity);
  if (!updated) return sendNotFound(res, 'Cart item');

  await cart.save();
  await cart.populate({ path: 'items.product', select: 'title images price stock' });

  return sendSuccess(res, 200, 'Cart item updated successfully.', { cart });
});

// ─── DELETE /api/cart/items/:itemId ───────────────────────────────────────────
exports.removeFromCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return sendNotFound(res, 'Cart');

  const removed = cart.removeItem(itemId);
  if (!removed) return sendNotFound(res, 'Cart item');

  await cart.save();
  await cart.populate({ path: 'items.product', select: 'title images price stock' });

  return sendSuccess(res, 200, 'Item removed from cart.', { cart });
});

// ─── DELETE /api/cart ─────────────────────────────────────────────────────────
exports.clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (cart) {
    cart.clearCart();
    await cart.save();
  }

  return sendSuccess(res, 200, 'Cart cleared successfully.');
});
