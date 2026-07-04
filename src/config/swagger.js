/**
 * src/config/swagger.js — Swagger / OpenAPI 3.0 Configuration
 *
 * Responsibilities:
 *  - Define OpenAPI spec metadata (title, version, servers)
 *  - Define reusable schemas (User, Product, Cart, Order, Error)
 *  - Configure JWT Bearer security scheme
 *  - Export swaggerUi and swaggerSpec for mounting in app.js
 */

'use strict';

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// ─── OpenAPI Definition ───────────────────────────────────────────────────────
const swaggerDefinition = {
  openapi: '3.0.0',

  info: {
    title: '🛒 E-Commerce REST API',
    version: '1.0.0',
    description: `
## Production-ready E-Commerce Backend API

Built with **Node.js**, **Express.js**, and **MongoDB Atlas**.

### Features
- 🔐 JWT Authentication with Role-Based Access Control (Admin / Customer)
- 📦 Full Product CRUD with Search, Filter, Pagination & Sorting
- 🛒 Cart Management (add, update, remove items)
- 🧾 Order Lifecycle (checkout, history, payment simulation)
- 👤 User Profile Management
- 🛡️ Security: Helmet, CORS, Rate Limiting, XSS, NoSQL Injection Protection
- 📊 Swagger / OpenAPI 3.0 Documentation

### Authentication
All protected routes require a **Bearer Token** in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`
    `,
    contact: {
      name: 'Developer Arena',
      email: 'support@developerarena.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },

  // ─── Servers ────────────────────────────────────────────────────────────────
  servers: [
    {
      url: 'http://localhost:5000',
      description: '🛠️ Local Development Server',
    },
    {
      url: 'https://ecommerce-api.onrender.com',
      description: '🚀 Production Server (Render)',
    },
  ],

  // ─── Security Scheme ─────────────────────────────────────────────────────────
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token obtained from POST /api/auth/login',
      },
    },

    // ─── Reusable Schemas ──────────────────────────────────────────────────────
    schemas: {

      // ── Success Response Wrapper ──────────────────────────────────────────
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation successful' },
          data: { type: 'object' },
        },
      },

      // ── Error Response ────────────────────────────────────────────────────
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Something went wrong' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'email' },
                message: { type: 'string', example: 'Email is required' },
              },
            },
          },
        },
      },

      // ── Pagination Meta ───────────────────────────────────────────────────
      PaginationMeta: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 100 },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          totalPages: { type: 'integer', example: 10 },
          hasNextPage: { type: 'boolean', example: true },
          hasPrevPage: { type: 'boolean', example: false },
        },
      },

      // ── User Schema ───────────────────────────────────────────────────────
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '64a7b2c3d4e5f60001234567' },
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          phone: { type: 'string', example: '+1-555-0100' },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string', example: '123 Main St' },
              city: { type: 'string', example: 'New York' },
              state: { type: 'string', example: 'NY' },
              country: { type: 'string', example: 'USA' },
              zipCode: { type: 'string', example: '10001' },
            },
          },
          role: { type: 'string', enum: ['customer', 'admin'], example: 'customer' },
          isEmailVerified: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // ── Register Input ────────────────────────────────────────────────────
      RegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          password: { type: 'string', format: 'password', minLength: 8, example: 'SecurePass123!' },
          phone: { type: 'string', example: '+1-555-0100' },
        },
      },

      // ── Login Input ───────────────────────────────────────────────────────
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          password: { type: 'string', format: 'password', example: 'SecurePass123!' },
        },
      },

      // ── Auth Response ─────────────────────────────────────────────────────
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Login successful' },
          data: {
            type: 'object',
            properties: {
              token: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
              user: { $ref: '#/components/schemas/User' },
            },
          },
        },
      },

      // ── Product Schema ────────────────────────────────────────────────────
      Product: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '64a7b2c3d4e5f60001234568' },
          title: { type: 'string', example: 'Apple iPhone 15 Pro' },
          description: { type: 'string', example: 'Latest iPhone with titanium design' },
          category: { type: 'string', example: 'Electronics' },
          brand: { type: 'string', example: 'Apple' },
          images: {
            type: 'array',
            items: { type: 'string', format: 'uri' },
            example: ['https://example.com/img1.jpg'],
          },
          price: { type: 'number', format: 'float', example: 999.99 },
          stock: { type: 'integer', example: 50 },
          rating: {
            type: 'object',
            properties: {
              average: { type: 'number', example: 4.7 },
              count: { type: 'integer', example: 128 },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // ── Product Input ─────────────────────────────────────────────────────
      ProductInput: {
        type: 'object',
        required: ['title', 'price', 'stock', 'category'],
        properties: {
          title: { type: 'string', example: 'Apple iPhone 15 Pro' },
          description: { type: 'string', example: 'Latest iPhone with titanium design' },
          category: { type: 'string', example: 'Electronics' },
          brand: { type: 'string', example: 'Apple' },
          price: { type: 'number', example: 999.99 },
          stock: { type: 'integer', example: 50 },
        },
      },

      // ── Cart Schema ───────────────────────────────────────────────────────
      CartItem: {
        type: 'object',
        properties: {
          product: { $ref: '#/components/schemas/Product' },
          quantity: { type: 'integer', example: 2 },
          price: { type: 'number', example: 999.99 },
        },
      },

      Cart: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '64a7b2c3d4e5f60001234569' },
          user: { type: 'string', example: '64a7b2c3d4e5f60001234567' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/CartItem' },
          },
          totalPrice: { type: 'number', example: 1999.98 },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      // ── Add to Cart Input ─────────────────────────────────────────────────
      AddToCartInput: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'string', example: '64a7b2c3d4e5f60001234568' },
          quantity: { type: 'integer', minimum: 1, example: 2 },
        },
      },

      // ── Order Schema ──────────────────────────────────────────────────────
      OrderItem: {
        type: 'object',
        properties: {
          product: { $ref: '#/components/schemas/Product' },
          quantity: { type: 'integer', example: 2 },
          price: { type: 'number', example: 999.99 },
        },
      },

      Order: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '64a7b2c3d4e5f60001234570' },
          user: { type: 'string', example: '64a7b2c3d4e5f60001234567' },
          products: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderItem' },
          },
          shippingAddress: {
            type: 'object',
            properties: {
              street: { type: 'string', example: '123 Main St' },
              city: { type: 'string', example: 'New York' },
              state: { type: 'string', example: 'NY' },
              country: { type: 'string', example: 'USA' },
              zipCode: { type: 'string', example: '10001' },
            },
          },
          paymentMethod: {
            type: 'string',
            enum: ['credit_card', 'debit_card', 'paypal', 'cod'],
            example: 'credit_card',
          },
          paymentStatus: {
            type: 'string',
            enum: ['pending', 'paid', 'failed', 'refunded'],
            example: 'pending',
          },
          orderStatus: {
            type: 'string',
            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
            example: 'pending',
          },
          totalAmount: { type: 'number', example: 1999.98 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // ── Checkout Input ────────────────────────────────────────────────────
      CheckoutInput: {
        type: 'object',
        required: ['shippingAddress', 'paymentMethod'],
        properties: {
          shippingAddress: {
            type: 'object',
            required: ['street', 'city', 'country', 'zipCode'],
            properties: {
              street: { type: 'string', example: '123 Main St' },
              city: { type: 'string', example: 'New York' },
              state: { type: 'string', example: 'NY' },
              country: { type: 'string', example: 'USA' },
              zipCode: { type: 'string', example: '10001' },
            },
          },
          paymentMethod: {
            type: 'string',
            enum: ['credit_card', 'debit_card', 'paypal', 'cod'],
            example: 'credit_card',
          },
        },
      },
    }, // end schemas

    // ─── Reusable Response Objects ──────────────────────────────────────────
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Authentication failed. No token provided.',
              errors: [],
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Insufficient permissions (Admin only)',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Access denied. Admin privileges required.',
              errors: [],
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Resource not found',
              errors: [],
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Validation failed',
              errors: [{ field: 'email', message: 'Must be a valid email' }],
            },
          },
        },
      },
    },
  }, // end components

  // ─── Global Security ─────────────────────────────────────────────────────────
  security: [{ BearerAuth: [] }],

  // ─── Tags (Route Grouping) ───────────────────────────────────────────────────
  tags: [
    { name: 'Health', description: 'Server health check' },
    { name: 'Auth', description: 'Authentication & authorization endpoints' },
    { name: 'Products', description: 'Product catalog management' },
    { name: 'Cart', description: 'Shopping cart operations' },
    { name: 'Orders', description: 'Order management & checkout' },
    { name: 'Users', description: 'User management (Admin only)' },
  ],
};

// ─── Swagger JSDoc Options ────────────────────────────────────────────────────
const options = {
  swaggerDefinition,
  // Scan these files for @openapi JSDoc comments
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/app.js',
  ],
};

// ─── Generate Spec ────────────────────────────────────────────────────────────
const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };
