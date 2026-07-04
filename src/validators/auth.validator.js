/**
 * src/validators/auth.validator.js — Auth Route Validators
 *
 * Validation chains for:
 *  - register  : name, email, password, optional phone
 *  - login     : email, password
 *  - refreshToken: refreshToken string
 */

'use strict';

const { body } = require('express-validator');

// ─── Register Validator ───────────────────────────────────────────────────────
const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/).withMessage('Password must contain at least one number'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s\-(]{7,20}$/).withMessage('Please provide a valid phone number'),
];

// ─── Login Validator ──────────────────────────────────────────────────────────
const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

// ─── Refresh Token Validator ──────────────────────────────────────────────────
const refreshTokenValidator = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required')
    .isString().withMessage('Refresh token must be a string'),
];

module.exports = {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
};
