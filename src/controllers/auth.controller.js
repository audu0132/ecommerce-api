/**
 * src/controllers/auth.controller.js — Authentication Controllers
 *
 * Handlers:
 *  - register      : Create user + issue tokens
 *  - login         : Verify credentials + issue tokens
 *  - logout        : Clear refresh token from DB
 *  - refreshToken  : Issue new access token via refresh token
 *  - getMe         : Return current authenticated user
 */

'use strict';

const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const {
  sendSuccess,
  sendCreated,
  sendError,
  sendUnauthorized,
} = require('../utils/apiResponse');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/tokenUtils');

// ─── Helper: Build Auth Response Payload ──────────────────────────────────────
/**
 * Generates both tokens, saves the refresh token on the user document,
 * and returns a standardized auth payload object.
 *
 * @param {Object} user - Mongoose User document
 * @returns {{ accessToken, refreshToken, user }}
 */
const buildAuthPayload = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Persist refresh token for rotation / logout invalidation
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return {
    accessToken,
    refreshToken,
    user: user.toJSON(), // strips password, tokens via toJSON transform
  };
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
/**
 * Register a new user account.
 * Returns 409 if the email is already taken.
 * Returns 201 with tokens on success.
 */
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  // Check for duplicate email
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return sendError(res, 409, 'An account with this email address already exists.');
  }

  // Create user (password hashing handled by pre-save middleware)
  const user = await User.create({ name, email, password, phone });

  const payload = await buildAuthPayload(user);

  return sendCreated(res, 'Account created successfully. Welcome!', payload);
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
/**
 * Authenticate an existing user.
 * Returns 401 for invalid credentials (deliberate vague message for security).
 * Returns 200 with tokens on success.
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // findByEmailWithPassword includes the password field (excluded by default)
  const user = await User.findByEmailWithPassword(email);

  if (!user || !(await user.comparePassword(password))) {
    return sendUnauthorized(res, 'Invalid email or password.');
  }

  if (!user.isActive) {
    return sendUnauthorized(res, 'Your account has been deactivated. Please contact support.');
  }

  const payload = await buildAuthPayload(user);

  return sendSuccess(res, 200, 'Login successful.', payload);
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
/**
 * Log out the current user.
 * Clears the stored refresh token so it cannot be reused.
 * Requires: protect middleware (req.user is populated).
 */
exports.logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null }, { new: false });

  return sendSuccess(res, 200, 'Logged out successfully.');
});

// ─── POST /api/auth/refresh-token ─────────────────────────────────────────────
/**
 * Issue a new access token using a valid refresh token.
 * Implements token rotation: old refresh token is replaced with a new one.
 */
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  // 1. Verify refresh token signature & expiry
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Refresh token has expired. Please log in again.'
      : 'Invalid refresh token. Please log in again.';
    return sendUnauthorized(res, message);
  }

  // 2. Find user and check stored token matches (rotation guard)
  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    return sendUnauthorized(res, 'Invalid refresh token. Please log in again.');
  }

  if (!user.isActive) {
    return sendUnauthorized(res, 'Your account has been deactivated.');
  }

  // 3. Issue new token pair (rotation)
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  return sendSuccess(res, 200, 'Token refreshed successfully.', {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
/**
 * Return the currently authenticated user's profile.
 * Requires: protect middleware.
 */
exports.getMe = asyncHandler(async (req, res) => {
  // req.user is already populated and sanitized by protect middleware
  return sendSuccess(res, 200, 'User profile retrieved successfully.', {
    user: req.user.toJSON(),
  });
});
