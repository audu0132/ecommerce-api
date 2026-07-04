/**
 * src/models/Order.js — Mongoose Order Model
 *
 * Schema Fields:
 *  - user: ref to User
 *  - orderNumber: human-readable unique identifier
 *  - products[]: snapshot of ordered items (product ref, qty, price)
 *  - shippingAddress: embedded address at time of order
 *  - paymentMethod: credit_card | debit_card | paypal | cod
 *  - paymentStatus: pending | paid | failed | refunded
 *  - orderStatus: pending → processing → shipped → delivered | cancelled
 *  - totalAmount: final order total
 *  - statusHistory[]: audit log of all status changes
 *  - createdAt (via timestamps)
 *
 * Design Decisions:
 *  - Products are SNAPSHOT (denormalized) — price/title won't change after order
 *  - statusHistory provides full audit trail for admin tracking
 *  - orderNumber is auto-generated (ORD-YYYYMMDD-XXXXX format)
 */

'use strict';

const mongoose = require('mongoose');

// ─── Order Item Sub-Schema (Snapshot) ────────────────────────────────────────
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },

    // Snapshot fields — copied from product at time of order
    title: {
      type: String,
      required: [true, 'Product title snapshot is required'],
    },

    image: {
      type: String, // First image URL
      default: '',
    },

    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number',
      },
    },

    price: {
      type: Number,
      required: [true, 'Price at time of purchase is required'],
      min: [0, 'Price cannot be negative'],
    },
  },
  { _id: false }
);

// ─── Status History Sub-Schema ────────────────────────────────────────────────
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    note: {
      type: String,
      trim: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// ─── Shipping Address Sub-Schema (Snapshot) ───────────────────────────────────
const shippingAddressSchema = new mongoose.Schema(
  {
    street: { type: String, required: [true, 'Street address is required'], trim: true },
    city: { type: String, required: [true, 'City is required'], trim: true },
    state: { type: String, trim: true },
    country: { type: String, required: [true, 'Country is required'], trim: true },
    zipCode: { type: String, required: [true, 'Zip code is required'], trim: true },
  },
  { _id: false }
);

// ─── Order Schema ─────────────────────────────────────────────────────────────
const orderSchema = new mongoose.Schema(
  {
    // Human-readable order reference (e.g., ORD-20240701-AB3F9)
    orderNumber: {
      type: String,
      unique: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Order must belong to a user'],
      index: true,
    },

    products: {
      type: [orderItemSchema],
      required: [true, 'Order must have at least one product'],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'Order must contain at least one product',
      },
    },

    shippingAddress: {
      type: shippingAddressSchema,
      required: [true, 'Shipping address is required'],
    },

    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: ['credit_card', 'debit_card', 'paypal', 'cod'],
        message: 'Payment method must be one of: credit_card, debit_card, paypal, cod',
      },
    },

    paymentStatus: {
      type: String,
      enum: {
        values: ['pending', 'paid', 'failed', 'refunded'],
        message: 'Invalid payment status',
      },
      default: 'pending',
    },

    orderStatus: {
      type: String,
      enum: {
        values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        message: 'Invalid order status',
      },
      default: 'pending',
    },

    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
      set: (val) => Math.round(val * 100) / 100,
    },

    // ── Payment Simulation ─────────────────────────────────────────────────
    paidAt: {
      type: Date, // Timestamp when payment was confirmed
    },

    deliveredAt: {
      type: Date, // Timestamp when order was delivered
    },

    cancelledAt: {
      type: Date,
    },

    cancellationReason: {
      type: String,
      trim: true,
    },

    // ── Status Audit Trail ─────────────────────────────────────────────────
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    // ── Notes ──────────────────────────────────────────────────────────────
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ orderNumber: 1 });

// ─── Virtual: itemCount ───────────────────────────────────────────────────────
orderSchema.virtual('itemCount').get(function () {
  return this.products.reduce((sum, item) => sum + item.quantity, 0);
});

// ─── Pre-Save Middleware: Generate Order Number ───────────────────────────────
/**
 * Auto-generate a human-readable order number on first save.
 * Format: ORD-YYYYMMDD-XXXXX (e.g., ORD-20240701-AB3F9)
 */
orderSchema.pre('save', function (next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).toUpperCase().substring(2, 7);
    this.orderNumber = `ORD-${datePart}-${randomPart}`;
  }
  next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Update the order status and append to status history.
 *
 * @param {string} newStatus - New order status
 * @param {string} changedById - ObjectId of the user making the change
 * @param {string} [note] - Optional note about the status change
 */
orderSchema.methods.updateStatus = function (newStatus, changedById, note = '') {
  this.orderStatus = newStatus;
  this.statusHistory.push({
    status: newStatus,
    changedBy: changedById,
    note,
    changedAt: new Date(),
  });

  // Set specific timestamps
  if (newStatus === 'delivered') this.deliveredAt = new Date();
  if (newStatus === 'cancelled') this.cancelledAt = new Date();
};

/**
 * Simulate payment processing.
 * In production, this would integrate with Stripe/PayPal.
 *
 * @param {boolean} [success=true] - Simulate success or failure
 */
orderSchema.methods.simulatePayment = function (success = true) {
  if (success) {
    this.paymentStatus = 'paid';
    this.paidAt = new Date();
    this.orderStatus = 'processing';
  } else {
    this.paymentStatus = 'failed';
  }
};

// ─── Compile & Export Model ───────────────────────────────────────────────────
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
