/**
 * src/middleware/validate.middleware.js — Input Validation Runner
 *
 * Runs express-validator validation chains and returns standardized
 * error responses if validation fails — stopping execution before
 * the controller runs.
 *
 * Usage in routes:
 *   const { validate } = require('../middleware/validate.middleware');
 *   const { registerValidator } = require('../validators/auth.validator');
 *
 *   router.post('/register', registerValidator, validate, register);
 *
 * If validation passes → next() is called → controller runs.
 * If validation fails  → 422 response with field errors is returned.
 */

'use strict';

const { validationResult } = require('express-validator');

/**
 * validate — Checks the result of express-validator chains.
 *
 * Returns a 422 Unprocessable Entity response with all field errors
 * if any validation rule fails. Otherwise calls next().
 *
 * @type {import('express').RequestHandler}
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format errors into our standard { field, message } shape
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param || 'unknown',
      message: err.msg,
      // Include the rejected value in development for easier debugging
      ...(process.env.NODE_ENV === 'development' && { value: err.value }),
    }));

    return res.status(422).json({
      success: false,
      message: 'Validation failed. Please check your input and try again.',
      errors: formattedErrors,
    });
  }

  next();
};

module.exports = { validate };
