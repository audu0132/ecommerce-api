/**
 * src/utils/apiResponse.js — Standardized API Response Helpers
 *
 * Every controller uses these helpers to ensure a consistent response shape:
 *
 * Success:
 *   { success: true, message: "", data: {} }
 *
 * Error:
 *   { success: false, message: "", errors: [] }
 *
 * Paginated:
 *   { success: true, message: "", data: [], meta: { pagination } }
 */

'use strict';

/**
 * Send a successful response.
 *
 * @param {import('express').Response} res
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Human-readable success message
 * @param {*} data - Response payload (object, array, null)
 * @returns {import('express').Response}
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send a created (201) response.
 *
 * @param {import('express').Response} res
 * @param {string} message
 * @param {*} data
 */
const sendCreated = (res, message = 'Resource created successfully', data = null) => {
  return sendSuccess(res, 201, message, data);
};

/**
 * Send an error response.
 *
 * @param {import('express').Response} res
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} message - Human-readable error message
 * @param {Array} errors - Array of validation/field errors
 * @returns {import('express').Response}
 */
const sendError = (res, statusCode = 500, message = 'Something went wrong', errors = []) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

/**
 * Send a paginated list response.
 *
 * @param {import('express').Response} res
 * @param {string} message
 * @param {Array} data - Array of items for the current page
 * @param {Object} pagination - Pagination metadata
 * @param {number} pagination.total - Total items across all pages
 * @param {number} pagination.page - Current page number
 * @param {number} pagination.limit - Items per page
 * @returns {import('express').Response}
 */
const sendPaginated = (res, message = 'Data retrieved successfully', data = [], pagination = {}) => {
  const { total = 0, page = 1, limit = 10 } = pagination;
  const totalPages = Math.ceil(total / limit);

  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  });
};

/**
 * Send a 204 No Content response.
 * Used for DELETE operations that return nothing.
 *
 * @param {import('express').Response} res
 */
const sendNoContent = (res) => {
  return res.status(204).send();
};

/**
 * Send a 401 Unauthorized response.
 *
 * @param {import('express').Response} res
 * @param {string} message
 */
const sendUnauthorized = (res, message = 'Authentication required. Please log in.') => {
  return sendError(res, 401, message);
};

/**
 * Send a 403 Forbidden response.
 *
 * @param {import('express').Response} res
 * @param {string} message
 */
const sendForbidden = (res, message = 'Access denied. Insufficient permissions.') => {
  return sendError(res, 403, message);
};

/**
 * Send a 404 Not Found response.
 *
 * @param {import('express').Response} res
 * @param {string} resource - Name of the resource (e.g., 'Product', 'Order')
 */
const sendNotFound = (res, resource = 'Resource') => {
  return sendError(res, 404, `${resource} not found.`);
};

module.exports = {
  sendSuccess,
  sendCreated,
  sendError,
  sendPaginated,
  sendNoContent,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
};
