/**
 * src/validators/user.validator.js — User Route Validators
 */

'use strict';

const { body } = require('express-validator');

// ─── Update Profile Validator ─────────────────────────────────────────────────
const updateProfileValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s\-(]{7,20}$/).withMessage('Please provide a valid phone number'),

  body('address.street')
    .optional()
    .trim(),

  body('address.city')
    .optional()
    .trim(),

  body('address.state')
    .optional()
    .trim(),

  body('address.country')
    .optional()
    .trim(),

  body('address.zipCode')
    .optional()
    .trim(),
];

// ─── Change Password Validator ────────────────────────────────────────────────
const changePasswordValidator = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('New password must contain at least one lowercase letter')
    .matches(/\d/).withMessage('New password must contain at least one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from your current password');
      }
      return true;
    }),

  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

module.exports = {
  updateProfileValidator,
  changePasswordValidator,
};
