/**
 * src/utils/tokenUtils.js — JWT Token Utilities
 *
 * Responsibilities:
 *  - Generate access tokens (short-lived)
 *  - Generate refresh tokens (long-lived, for rotation)
 *  - Verify and decode tokens
 *  - Extract token from Authorization header
 */

'use strict';

const jwt = require('jsonwebtoken');

// ─── Configuration ─────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// ─── Access Token ─────────────────────────────────────────────────────────────

/**
 * Generate a signed JWT access token.
 *
 * Payload: { id, role }
 * The minimal payload keeps token size small and avoids stale user data.
 *
 * @param {Object} user - User document from DB
 * @param {string} user._id - User's MongoDB ObjectId
 * @param {string} user.role - User's role ('customer' | 'admin')
 * @returns {string} Signed JWT token string
 */
const generateAccessToken = (user) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'ecommerce-api',
      audience: 'ecommerce-client',
    }
  );
};

/**
 * Verify and decode a JWT access token.
 *
 * @param {string} token - JWT string to verify
 * @returns {{ id: string, role: string, iat: number, exp: number }} Decoded payload
 * @throws {jwt.JsonWebTokenError} If token is invalid
 * @throws {jwt.TokenExpiredError} If token has expired
 */
const verifyAccessToken = (token) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.verify(token, JWT_SECRET, {
    issuer: 'ecommerce-api',
    audience: 'ecommerce-client',
  });
};

// ─── Refresh Token ─────────────────────────────────────────────────────────────

/**
 * Generate a long-lived refresh token.
 * Stored in DB and used to obtain new access tokens without re-login.
 *
 * @param {Object} user - User document
 * @param {string} user._id - User's MongoDB ObjectId
 * @returns {string} Signed refresh token string
 */
const generateRefreshToken = (user) => {
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
  }

  return jwt.sign(
    { id: user._id.toString() },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'ecommerce-api',
    }
  );
};

/**
 * Verify and decode a refresh token.
 *
 * @param {string} token - Refresh token string
 * @returns {{ id: string, iat: number, exp: number }} Decoded payload
 * @throws {jwt.JsonWebTokenError} If token is invalid
 * @throws {jwt.TokenExpiredError} If token has expired
 */
const verifyRefreshToken = (token) => {
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
  }

  return jwt.verify(token, JWT_REFRESH_SECRET, {
    issuer: 'ecommerce-api',
  });
};

// ─── Token Extraction ─────────────────────────────────────────────────────────

/**
 * Extract Bearer token from the Authorization header.
 *
 * Expected header format: "Authorization: Bearer <token>"
 *
 * @param {import('express').Request} req
 * @returns {string|null} Token string, or null if not found
 */
const extractTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  return token && token.trim() ? token.trim() : null;
};

/**
 * Get token expiry information.
 * Useful for setting cookie maxAge or displaying "expires in X" to the user.
 *
 * @param {string} token - JWT to decode
 * @returns {{ expiresAt: Date, expiresInMs: number } | null}
 */
const getTokenExpiry = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return null;

    const expiresAt = new Date(decoded.exp * 1000);
    const expiresInMs = expiresAt.getTime() - Date.now();

    return { expiresAt, expiresInMs };
  } catch {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  getTokenExpiry,
};
