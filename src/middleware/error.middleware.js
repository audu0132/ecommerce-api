/**
 * src/middleware/error.middleware.js — Central Error Handling Middleware
 *
 * Responsibilities:
 *  - Catch all errors forwarded via next(err)
 *  - Map known error types to correct HTTP status codes
 *  - Return consistent error response format
 *  - Prevent leaking stack traces in production
 *
 * Error Types Handled:
 *  - Mongoose CastError          → 400 (invalid ObjectId format)
 *  - Mongoose ValidationError    → 400 (schema validation failures)
 *  - Mongoose Duplicate Key (11000) → 409 (unique constraint violation)
 *  - JWT TokenExpiredError       → 401
 *  - JWT JsonWebTokenError       → 401
 *  - SyntaxError (bad JSON body) → 400
 *  - Custom AppError             → uses error.statusCode
 *  - All others                  → 500 Internal Server Error
 */

'use strict';

// ─── Custom Application Error Class ──────────────────────────────────────────

/**
 * AppError — Custom error class for operational errors (expected failures).
 * Use this to throw errors with specific HTTP status codes from controllers.
 *
 * @example
 *   throw new AppError('Product not found', 404);
 *   throw new AppError('Email already in use', 409);
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {Array} [errors=[]] - Optional array of field-level errors
   */
  constructor(message, statusCode, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Distinguishes from programming errors
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Error Handler Helpers ────────────────────────────────────────────────────

/**
 * Handle Mongoose CastError (e.g., invalid ObjectId: "abc" instead of a valid ObjectId)
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: "${err.value}". Please provide a valid ID.`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose ValidationError (schema-level field validation failures)
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((el) => ({
    field: el.path,
    message: el.message,
  }));
  const message = `Validation failed. Please check your input.`;
  return new AppError(message, 400, errors);
};

/**
 * Handle MongoDB Duplicate Key Error (unique index violation)
 * E.g., registering with an email that already exists
 */
const handleDuplicateKeyError = (err) => {
  // Extract field name from error message
  const match = err.message.match(/index: (\w+)_/);
  const field = match ? match[1] : 'field';
  const message = `Duplicate value for "${field}". This ${field} is already in use.`;
  return new AppError(message, 409);
};

/**
 * Handle JWT expired token
 */
const handleJwtExpiredError = () => {
  return new AppError('Your session has expired. Please log in again.', 401);
};

/**
 * Handle JWT invalid token (bad signature, malformed)
 */
const handleJwtError = () => {
  return new AppError('Invalid authentication token. Please log in again.', 401);
};

/**
 * Handle malformed JSON in request body
 */
const handleSyntaxError = (err) => {
  if (err.type === 'entity.parse.failed') {
    return new AppError('Invalid JSON in request body.', 400);
  }
  return err;
};

// ─── Response Senders ─────────────────────────────────────────────────────────

/** Send detailed error response in development (includes stack trace) */
const sendDevError = (err, res) => {
  return res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    errors: err.errors || [],
    stack: err.stack,
    error: err,
  });
};

/** Send safe error response in production (no stack traces leaked) */
const sendProdError = (err, res) => {
  // Only send details for operational errors (expected failures like 404, 400)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
  }

  // Programming or unknown error — log it, don't expose details
  console.error('💥 UNEXPECTED ERROR:', err);

  return res.status(500).json({
    success: false,
    message: 'Something went wrong on our end. Please try again later.',
    errors: [],
  });
};

// ─── Global Error Handler ─────────────────────────────────────────────────────

/**
 * errorHandler — Express 4-argument error handling middleware.
 * Must be registered LAST in app.js with app.use(errorHandler).
 *
 * @type {import('express').ErrorRequestHandler}
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Set defaults
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const isDev = process.env.NODE_ENV === 'development';

  // Log all errors (in production, this goes to your logging system)
  if (isDev || err.statusCode >= 500) {
    console.error(`❌ [${req.method}] ${req.originalUrl} → ${err.statusCode}: ${err.message}`);
  }

  // ── Map known error types to AppError ──────────────────────────────────
  let error = { ...err, message: err.message };

  if (err.name === 'CastError') error = handleCastError(err);
  else if (err.name === 'ValidationError') error = handleValidationError(err);
  else if (err.code === 11000) error = handleDuplicateKeyError(err);
  else if (err.name === 'TokenExpiredError') error = handleJwtExpiredError();
  else if (err.name === 'JsonWebTokenError') error = handleJwtError();
  else if (err instanceof SyntaxError) error = handleSyntaxError(err);

  // ── Send response based on environment ──────────────────────────────────
  if (isDev) {
    sendDevError(error, res);
  } else {
    sendProdError(error, res);
  }
};

// ─── 404 Not Found Handler ────────────────────────────────────────────────────

/**
 * notFound — Catches requests to undefined routes and passes a 404 AppError.
 * Must be registered BEFORE errorHandler but AFTER all routes in app.js.
 *
 * @type {import('express').RequestHandler}
 */
const notFound = (req, res, next) => {
  const error = new AppError(
    `Route not found: [${req.method}] ${req.originalUrl}`,
    404
  );
  next(error);
};

module.exports = { errorHandler, notFound, AppError };
