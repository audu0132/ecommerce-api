/**
 * src/models/User.js — Mongoose User Model
 *
 * Schema Fields:
 *  - name, email, password, phone, address (sub-document)
 *  - role: 'customer' | 'admin'
 *  - isEmailVerified, emailVerificationToken
 *  - passwordResetToken, passwordResetExpires (bonus: forgot password)
 *  - refreshToken (bonus: refresh token rotation)
 *  - createdAt (via timestamps)
 *
 * Methods:
 *  - comparePassword(candidatePassword) → boolean
 *
 * Middleware (pre-save):
 *  - Hash password with bcrypt before saving
 */

'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Address Sub-Schema ───────────────────────────────────────────────────────
const addressSchema = new mongoose.Schema(
  {
    street: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
  },
  { _id: false } // Don't create a separate _id for embedded address
);

// ─── User Schema ──────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password in queries by default
    },

    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-()]{7,20}$/, 'Please provide a valid phone number'],
    },

    address: {
      type: addressSchema,
      default: {},
    },

    role: {
      type: String,
      enum: {
        values: ['customer', 'admin'],
        message: 'Role must be either customer or admin',
      },
      default: 'customer',
    },

    // ── Email Verification (Bonus) ────────────────────────────────────────
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      select: false,
    },

    // ── Password Reset (Bonus) ────────────────────────────────────────────
    passwordResetToken: {
      type: String,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // ── Refresh Token (Bonus) ─────────────────────────────────────────────
    refreshToken: {
      type: String,
      select: false,
    },

    // ── Account Status ────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically

    // Customize toJSON to hide sensitive fields
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.emailVerificationToken;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// ─── Pre-Save Middleware: Hash Password ───────────────────────────────────────
/**
 * Only hash the password if it has been modified (or is new).
 * This prevents double-hashing on other field updates.
 */
userSchema.pre('save', async function (next) {
  // Only run if password was actually modified
  if (!this.isModified('password')) return next();

  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Compare a plain-text password against the stored hashed password.
 *
 * @param {string} candidatePassword - Plain text password from the login request
 * @returns {Promise<boolean>} true if passwords match
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if the password was changed after a given JWT timestamp.
 * Used to invalidate old tokens after password change.
 *
 * @param {number} jwtTimestamp - Token's iat (issued at) in seconds
 * @returns {boolean} true if password was changed after token was issued
 */
userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

// ─── Static Methods ───────────────────────────────────────────────────────────

/**
 * Find user by email and include the password field.
 * Needed for login where password is normally excluded.
 *
 * @param {string} email
 * @returns {Promise<User>}
 */
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

// ─── Compile & Export Model ───────────────────────────────────────────────────
const User = mongoose.model('User', userSchema);

module.exports = User;
