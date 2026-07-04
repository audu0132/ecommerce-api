/**
 * src/config/db.js — MongoDB Connection Manager
 *
 * Responsibilities:
 *  - Connect to MongoDB Atlas via Mongoose
 *  - Retry on connection failure (with exponential backoff)
 *  - Log connection lifecycle events
 *  - Export disconnect helper for testing
 */

'use strict';

const mongoose = require('mongoose');

// ─── Configuration ────────────────────────────────────────────────────────────
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000; // 5 seconds base delay

/**
 * Establish connection to MongoDB Atlas.
 * Retries up to MAX_RETRIES times with exponential backoff.
 *
 * @param {number} retryCount - Current retry attempt (internal)
 * @returns {Promise<void>}
 */
const connectDB = async (retryCount = 0) => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      // Mongoose 8.x uses these options by default, but explicit for clarity
      serverSelectionTimeoutMS: 10000, // Timeout after 10s if can't connect
      socketTimeoutMS: 45000,          // Close socket after 45s of inactivity
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);

    // Reset retry counter on success
    retryCount = 0;

  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);

    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
      console.log(`🔄 Retrying connection in ${delay / 1000}s... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);

      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectDB(retryCount + 1);
    }

    console.error(`💥 Failed to connect to MongoDB after ${MAX_RETRIES} attempts. Exiting.`);
    process.exit(1);
  }
};

// ─── Mongoose Connection Event Listeners ─────────────────────────────────────

mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose: connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error(`🔴 Mongoose connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('🟡 Mongoose: disconnected from MongoDB');
});

// ─── Graceful Disconnect ─────────────────────────────────────────────────────

/**
 * Close the Mongoose connection.
 * Primarily used in tests to clean up after each test suite.
 *
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed.');
};

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
