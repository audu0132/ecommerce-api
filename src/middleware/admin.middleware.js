/**
 * src/middleware/admin.middleware.js — Role-Based Access Control Middleware
 *
 * Provides granular role checking after the protect middleware runs.
 * req.user must already be populated by protect() before using these.
 *
 * Usage:
 *   // Admin only
 *   router.delete('/products/:id', protect, adminOnly, deleteProduct);
 *
 *   // Multiple roles allowed
 *   router.get('/orders', protect, requireRole('admin', 'manager'), getOrders);
 */

'use strict';

const { sendForbidden, sendUnauthorized } = require('../utils/apiResponse');

/**
 * adminOnly — Restricts access to users with the 'admin' role.
 *
 * Must be used AFTER the protect middleware, which populates req.user.
 *
 * @type {import('express').RequestHandler}
 */
const adminOnly = (req, res, next) => {
  // Ensure protect() has run first
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required.');
  }

  if (req.user.role !== 'admin') {
    return sendForbidden(
      res,
      `Access denied. This route requires admin privileges. Your role: ${req.user.role}`
    );
  }

  next();
};

/**
 * requireRole — Factory function: restricts access to specified roles.
 *
 * More flexible than adminOnly for future role expansions (e.g., 'manager', 'seller').
 *
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'manager')
 * @returns {import('express').RequestHandler}
 *
 * @example
 *   router.get('/dashboard', protect, requireRole('admin', 'manager'), getDashboard);
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required.');
    }

    if (!roles.includes(req.user.role)) {
      return sendForbidden(
        res,
        `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`
      );
    }

    next();
  };
};

/**
 * ownerOrAdmin — Allows access if the user is:
 *   1. An admin (always allowed), OR
 *   2. The owner of the resource (req.params.id or req.params.userId matches req.user._id)
 *
 * Useful for: "a user can update their own profile, but an admin can update anyone's"
 *
 * @type {import('express').RequestHandler}
 */
const ownerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required.');
  }

  const isAdmin = req.user.role === 'admin';
  const targetId = req.params.id || req.params.userId;
  const isOwner = targetId && req.user._id.toString() === targetId.toString();

  if (!isAdmin && !isOwner) {
    return sendForbidden(
      res,
      'Access denied. You can only access your own resources.'
    );
  }

  next();
};

module.exports = { adminOnly, requireRole, ownerOrAdmin };
