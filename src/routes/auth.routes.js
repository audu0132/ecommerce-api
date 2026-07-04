/**
 * src/routes/auth.routes.js — Authentication Routes
 *
 * POST   /api/auth/register       — Register new user
 * POST   /api/auth/login          — Login
 * POST   /api/auth/logout         — Logout (requires auth)
 * POST   /api/auth/refresh-token  — Get new access token
 * GET    /api/auth/me             — Current user profile (requires auth)
 */

'use strict';

const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
} = require('../validators/auth.validator');

// ─── Public Routes ────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: Secret123
 *               phone:
 *                 type: string
 *                 example: "+1 555 000 0000"
 *     responses:
 *       201:
 *         description: Account created
 *       409:
 *         description: Email already in use
 *       422:
 *         description: Validation error
 */
router.post('/register', registerValidator, validate, authController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginValidator, validate, authController.login);

/**
 * @openapi
 * /api/auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using a valid refresh token
 */
router.post('/refresh-token', refreshTokenValidator, validate, authController.refreshToken);

// ─── Protected Routes ─────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out and invalidate refresh token
 *     security:
 *       - bearerAuth: []
 */
router.post('/logout', protect, authController.logout);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', protect, authController.getMe);

module.exports = router;
