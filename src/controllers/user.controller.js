/**
 * src/controllers/user.controller.js — User Controllers
 *
 * Handlers:
 *  - getProfile     : Customer — view own profile
 *  - updateProfile  : Customer — update name, phone, address
 *  - changePassword : Customer — change password (requires current password)
 *  - getAllUsers     : Admin — paginated list of all users
 *  - getUserById    : Admin — get any single user
 *  - deactivateUser : Admin — soft-delete (isActive: false)
 */

'use strict';

const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const {
  sendSuccess,
  sendError,
  sendNotFound,
  sendPaginated,
} = require('../utils/apiResponse');

// ─── GET /api/users/profile (Customer) ───────────────────────────────────────
exports.getProfile = asyncHandler(async (req, res) => {
  // req.user is populated and sanitized by protect middleware
  return sendSuccess(res, 200, 'Profile retrieved successfully.', {
    user: req.user.toJSON(),
  });
});

// ─── PATCH /api/users/profile (Customer) ─────────────────────────────────────
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, address } = req.body;

  // Only allow safe fields — never allow role/password via this route
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  return sendSuccess(res, 200, 'Profile updated successfully.', {
    user: user.toJSON(),
  });
});

// ─── PATCH /api/users/change-password (Customer) ─────────────────────────────
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Fetch with password (excluded by default)
  const user = await User.findById(req.user._id).select('+password');

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return sendError(res, 400, 'Current password is incorrect.');
  }

  // Apply new password (pre-save middleware will hash it)
  user.password = newPassword;

  // Invalidate all refresh tokens by clearing it
  user.refreshToken = null;

  await user.save();

  return sendSuccess(
    res,
    200,
    'Password changed successfully. Please log in again with your new password.'
  );
});

// ─── GET /api/users (Admin) ───────────────────────────────────────────────────
exports.getAllUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }
  if (req.query.search) {
    const regex = { $regex: req.query.search, $options: 'i' };
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-refreshToken -passwordResetToken -emailVerificationToken'),
    User.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Users retrieved successfully.', users, {
    total,
    page,
    limit,
  });
});

// ─── GET /api/users/:id (Admin) ───────────────────────────────────────────────
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    '-refreshToken -passwordResetToken -emailVerificationToken'
  );

  if (!user) return sendNotFound(res, 'User');

  return sendSuccess(res, 200, 'User retrieved successfully.', { user });
});

// ─── PATCH /api/users/:id/deactivate (Admin) ──────────────────────────────────
exports.deactivateUser = asyncHandler(async (req, res) => {
  // Prevent admin from deactivating themselves
  if (req.params.id === req.user._id.toString()) {
    return sendError(res, 400, 'You cannot deactivate your own account.');
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false, refreshToken: null }, // also invalidate sessions
    { new: true }
  );

  if (!user) return sendNotFound(res, 'User');

  return sendSuccess(res, 200, `User "${user.name}" has been deactivated.`);
});
