/**
 * src/middleware/auth.middleware.js — JWT Authentication Middleware
 *
 * Responsibilities:
 *  - Extract and verify JWT from Authorization header
 *  - Load the current user from DB (ensures user still exists & is active)
 *  - Attach req.user for use in downstream controllers
 *  - Reject requests with missing, expired, or invalid tokens
 *
 * Usage:
 *   router.get('/profile', protect, (req, res) => {
 *     res.json(req.user);
 *   });
 */

'use strict';

const User = require('../models/User');
const { verifyAccessToken, extractTokenFromHeader } = require('../utils/tokenUtils');
const { sendUnauthorized } = require('../utils/apiResponse');

/**
 * protect — Verifies JWT and attaches the authenticated user to req.user.
 *
 * Rejection cases:
 *  1. No Authorization header / token missing
 *  2. Token is malformed or signature invalid
 *  3. Token has expired
 *  4. User no longer exists in DB (deleted after token was issued)
 *  5. User account is deactivated (isActive: false)
 *
 * @type {import('express').RequestHandler}
 */
const protect = async (req, res, next) => {
  try {
    // 1. Extract token from "Authorization: Bearer <token>"
    const token = extractTokenFromHeader(req);

    if (!token) {
      return sendUnauthorized(res, 'Authentication required. Please provide a valid Bearer token.');
    }

    // 2. Verify token signature and expiry
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      // Distinguish between expired vs invalid for better error messages
      if (err.name === 'TokenExpiredError') {
        return sendUnauthorized(res, 'Your session has expired. Please log in again.');
      }
      return sendUnauthorized(res, 'Invalid token. Please log in again.');
    }

    // 3. Check if user still exists
    // This handles the case where a user was deleted after their token was issued
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return sendUnauthorized(res, 'The user associated with this token no longer exists.');
    }

    // 4. Check if user account is active
    if (!currentUser.isActive) {
      return sendUnauthorized(res, 'Your account has been deactivated. Please contact support.');
    }

    // 5. Check if password was changed after token was issued
    // (Bonus: invalidates tokens after password reset)
    if (currentUser.changedPasswordAfter && currentUser.changedPasswordAfter(decoded.iat)) {
      return sendUnauthorized(res, 'Password was recently changed. Please log in again.');
    }

    // ✅ Authentication successful — attach user to request
    req.user = currentUser;
    next();

  } catch (error) {
    return sendUnauthorized(res, 'Authentication failed. Please log in again.');
  }
};

/**
 * optionalProtect — Authenticates if a token is present, but doesn't reject if missing.
 * Useful for routes that behave differently for logged-in vs anonymous users.
 *
 * Example: GET /products returns wishlist status for logged-in users
 *
 * @type {import('express').RequestHandler}
 */
const optionalProtect = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req);

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = verifyAccessToken(token);
    const currentUser = await User.findById(decoded.id);

    req.user = currentUser && currentUser.isActive ? currentUser : null;
    next();
  } catch {
    // Token present but invalid — treat as unauthenticated (don't error out)
    req.user = null;
    next();
  }
};

module.exports = { protect, optionalProtect };
