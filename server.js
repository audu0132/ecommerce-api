/**
 * server.js — Application Entry Point
 *
 * Responsibilities:
 *  - Load environment variables
 *  - Connect to MongoDB
 *  - Start the Express HTTP server
 *  - Handle uncaught exceptions & unhandled rejections
 */

'use strict';

const dotenv = require('dotenv');

// Load environment variables FIRST before importing anything else
dotenv.config();

const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ─── Handle Uncaught Exceptions ────────────────────────────────────────────
// Must be registered before anything else
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION 💥 Shutting down...');
  console.error(`Error: ${err.name} — ${err.message}`);
  process.exit(1);
});

// ─── Connect to Database & Start Server ────────────────────────────────────
const startServer = async () => {
  try {
    // Connect to MongoDB Atlas
    await connectDB();

    // Start Express HTTP server
    const server = app.listen(PORT, () => {
      console.log('══════════════════════════════════════════');
      console.log(`🚀  Server running in ${NODE_ENV} mode`);
      console.log(`🌐  URL: http://localhost:${PORT}`);
      console.log(`📖  Docs: http://localhost:${PORT}/api-docs`);
      console.log('══════════════════════════════════════════');
    });

    // ─── Handle Unhandled Promise Rejections ───────────────────────────────
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION 💥 Shutting down...');
      console.error(`Error: ${err.name} — ${err.message}`);

      // Gracefully close server before exiting
      server.close(() => {
        process.exit(1);
      });
    });

    // ─── Graceful Shutdown (SIGTERM from Render/Heroku) ────────────────────
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('💤 Process terminated.');
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
