/**
 * src/models/Cart.js — Mongoose Cart Model
 *
 * Schema Fields:
 *  - user: ref to User (one cart per user)
 *  - items[]: array of { product, quantity, price (at time of add) }
 *  - totalPrice: computed from items (auto-updated via pre-save hook)
 *
 * Design Decisions:
 *  - Price is stored per item AT the time of addition (protects against price changes)
 *  - One cart document per user (upsert pattern)
 *  - totalPrice is always recalculated before save (no stale data)
 */

'use strict';

const mongoose = require('mongoose');

// ─── Cart Item Sub-Schema ─────────────────────────────────────────────────────
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },

    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      max: [100, 'Quantity cannot exceed 100'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number',
      },
    },

    // Price snapshot at the time of adding to cart
    // Prevents price fluctuation affecting the cart total
    price: {
      type: Number,
      required: [true, 'Item price is required'],
      min: [0, 'Price cannot be negative'],
    },
  },
  { _id: true } // Each cart item gets its own _id for individual updates
);

// ─── Cart Schema ──────────────────────────────────────────────────────────────
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Cart must belong to a user'],
      unique: true, // One cart per user
      index: true,
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },

    totalPrice: {
      type: Number,
      default: 0,
      min: [0, 'Total price cannot be negative'],
      set: (val) => Math.round(val * 100) / 100, // Keep to 2 decimal places
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
  }
);

// ─── Virtual: itemCount ───────────────────────────────────────────────────────
cartSchema.virtual('itemCount').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// ─── Virtual: isEmpty ─────────────────────────────────────────────────────────
cartSchema.virtual('isEmpty').get(function () {
  return this.items.length === 0;
});

// ─── Pre-Save Middleware: Recalculate Total Price ─────────────────────────────
/**
 * Automatically recalculate totalPrice before every save.
 * Ensures total is always consistent with items.
 */
cartSchema.pre('save', function (next) {
  this.totalPrice = this.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  // Round to 2 decimal places
  this.totalPrice = Math.round(this.totalPrice * 100) / 100;
  next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Add a product to the cart or increase its quantity if already present.
 *
 * @param {string} productId - The product's ObjectId
 * @param {number} quantity - Quantity to add
 * @param {number} price - Current product price
 */
cartSchema.methods.addItem = function (productId, quantity, price) {
  const existingItem = this.items.find(
    (item) => item.product.toString() === productId.toString()
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({ product: productId, quantity, price });
  }
};

/**
 * Update the quantity of a specific cart item.
 *
 * @param {string} itemId - The cart item's _id
 * @param {number} quantity - New quantity (set to 0 to remove)
 * @returns {boolean} true if item was found and updated
 */
cartSchema.methods.updateItemQuantity = function (itemId, quantity) {
  const item = this.items.id(itemId);
  if (!item) return false;

  if (quantity <= 0) {
    item.deleteOne();
  } else {
    item.quantity = quantity;
  }
  return true;
};

/**
 * Remove a specific item from the cart.
 *
 * @param {string} itemId - The cart item's _id
 * @returns {boolean} true if item was found and removed
 */
cartSchema.methods.removeItem = function (itemId) {
  const item = this.items.id(itemId);
  if (!item) return false;
  item.deleteOne();
  return true;
};

/**
 * Clear all items from the cart.
 * Used after successful checkout.
 */
cartSchema.methods.clearCart = function () {
  this.items = [];
  this.totalPrice = 0;
};

// ─── Compile & Export Model ───────────────────────────────────────────────────
const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
