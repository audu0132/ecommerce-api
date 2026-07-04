/**
 * app.js — Express Application Setup
 *
 * Responsibilities:
 *  - Initialize Express app
 *  - Register global security middleware
 *  - Mount all API routes
 *  - Register 404 & global error handlers
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');

// Route imports
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const userRoutes = require('./routes/user.routes');

// Middleware imports
const { notFound, errorHandler } = require('./middleware/error.middleware');

// Swagger
const { swaggerUi, swaggerSpec } = require('./config/swagger');

// ─── Initialize App ─────────────────────────────────────────────────────────
const app = express();

// ─── Security: HTTP Headers ─────────────────────────────────────────────────
app.use(helmet());

// ─── Security: CORS ─────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: Origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ─── Security: Global Rate Limiter ──────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

// Stricter limiter for auth endpoints to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
});

app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);

// ─── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Combined format for production (Apache-style)
  app.use(morgan('combined'));
}

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));       // Parse JSON bodies (max 10kb)
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Security: Data Sanitization ─────────────────────────────────────────────
// 1. Sanitize against NoSQL Injection (strips $ and . from req.body/params/query)
app.use(mongoSanitize());

// 2. Sanitize against XSS (clean HTML tags from input)
app.use(xss());

// 3. Prevent HTTP Parameter Pollution
app.use(
  hpp({
    whitelist: ['price', 'rating', 'stock', 'category'], // allow duplicate query params for these
  })
);

// ─── Static Files (for local uploads in dev) ─────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── API Documentation ───────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'E-Commerce API Docs',
  customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
}));

// ─── Health Check Endpoint ───────────────────────────────────────────────────
/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Server health check
 *     description: Returns server status, environment, and timestamp
 *     responses:
 *       200:
 *         description: Server is healthy
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy ✅',
    data: {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
    },
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use(notFound);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
