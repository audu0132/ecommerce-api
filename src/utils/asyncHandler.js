/**
 * src/utils/asyncHandler.js — Async Error Wrapper
 *
 * Wraps async route handlers to automatically catch rejected promises
 * and forward them to Express's global error handler via next(err).
 *
 * Without asyncHandler (verbose):
 *   router.get('/products', async (req, res, next) => {
 *     try {
 *       const products = await Product.find();
 *       res.json(products);
 *     } catch (err) {
 *       next(err); // Must remember this in EVERY handler
 *     }
 *   });
 *
 * With asyncHandler (clean):
 *   router.get('/products', asyncHandler(async (req, res) => {
 *     const products = await Product.find();
 *     res.json(products);
 *   }));
 *
 * Usage:
 *   const asyncHandler = require('../utils/asyncHandler');
 *   exports.getProducts = asyncHandler(async (req, res) => { ... });
 */

'use strict';

/**
 * Wraps an async Express route handler.
 * Catches any thrown error or rejected promise and passes it to next().
 *
 * @param {Function} fn - Async route handler function (req, res, next)
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
