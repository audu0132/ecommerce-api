/**
 * src/routes/user.routes.js — User Routes
 *
 * GET    /api/users/profile         — Get own profile (customer)
 * PATCH  /api/users/profile         — Update own profile (customer)
 * PATCH  /api/users/change-password — Change password (customer)
 * GET    /api/users                 — List all users (admin)
 * GET    /api/users/:id             — Get user by ID (admin)
 * PATCH  /api/users/:id/deactivate  — Deactivate user (admin)
 *
 * IMPORTANT: Specific routes (profile, change-password) must come BEFORE /:id
 */

'use strict';

const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { adminOnly } = require('../middleware/admin.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  updateProfileValidator,
  changePasswordValidator,
} = require('../validators/user.validator');

// All user routes require authentication
router.use(protect);

// ─── Customer Routes (specific paths before /:id) ─────────────────────────────

/**
 * @openapi
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get the current user's profile
 *     security:
 *       - bearerAuth: []
 *   patch:
 *     tags: [Users]
 *     summary: Update the current user's profile
 *     security:
 *       - bearerAuth: []
 */
router
  .route('/profile')
  .get(userController.getProfile)
  .patch(updateProfileValidator, validate, userController.updateProfile);

/**
 * @openapi
 * /api/users/change-password:
 *   patch:
 *     tags: [Users]
 *     summary: Change the current user's password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *               confirmPassword: { type: string }
 */
router.patch(
  '/change-password',
  changePasswordValidator,
  validate,
  userController.changePassword
);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [customer, admin] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 */
router.get('/', adminOnly, userController.getAllUsers);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user by ID (admin only)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', adminOnly, userController.getUserById);

/**
 * @openapi
 * /api/users/{id}/deactivate:
 *   patch:
 *     tags: [Users]
 *     summary: Deactivate a user account (admin only)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/deactivate', adminOnly, userController.deactivateUser);

module.exports = router;
