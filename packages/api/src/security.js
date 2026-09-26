/**
 * Security Middleware for Coherent.js API Framework
 * @fileoverview Provides authentication, authorization, and security utilities
 */

import { createHmac, randomBytes, pbkdf2Sync } from 'crypto';
import { Buffer } from 'buffer';

/**
 * Base64 URL encode
 * @param {string} str - String to encode
 * @returns {string} Base64 URL encoded string
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64 URL decode
 * @param {string} str - Base64 URL encoded string
 * @returns {string} Decoded string
 */
function base64UrlDecode(str) {
  // Add padding if needed
  str += '='.repeat((4 - str.length % 4) % 4);
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
}

/**
 * Create HMAC signature for JWT
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @returns {string} HMAC signature
 */
function createSignature(data, secret) {
  return createHmac('sha256', secret).update(data).digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Refuse to sign or verify without a caller-supplied secret.
 *
 * There used to be a built-in default, 'your-secret-key'. It was public, so
 * anyone could mint a token -- `{ role: 'admin' }` included -- that every
 * `withAuth()` without a configured secret accepted. A missing secret is a
 * deployment mistake, so it fails loudly instead of quietly falling back.
 *
 * @private
 * @param {unknown} secret - Secret supplied by the caller
 * @param {string} usage - How the caller should pass it, for the message
 */
function requireSecret(secret, usage) {
  if (typeof secret === 'string' ? secret.length > 0 : Buffer.isBuffer(secret) && secret.length > 0) {
    return;
  }
  throw new TypeError(
    `[coherent.js/api] ${usage}: a JWT secret is required (a non-empty string or Buffer), ` +
      'for example process.env.JWT_SECRET. There is no default secret.'
  );
}

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Expiration time (e.g., '1h', '30m', '7d')
 * @param {string} secret - Secret key (required)
 * @returns {string} JWT token
 * @throws {TypeError} If no secret is given
 */
export function generateJWT(payload, expiresIn = '1h', secret) {
  requireSecret(secret, "generateJWT(payload, expiresIn, secret) was called without a secret");

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // Calculate expiration time
  const now = Math.floor(Date.now() / 1000);
  let exp = now;
  
  if (expiresIn.endsWith('h')) {
    exp += parseInt(expiresIn) * 3600;
  } else if (expiresIn.endsWith('m')) {
    exp += parseInt(expiresIn) * 60;
  } else if (expiresIn.endsWith('d')) {
    exp += parseInt(expiresIn) * 86400;
  } else {
    exp += 3600; // Default 1 hour
  }

  const tokenPayload = {
    ...payload,
    iat: now,
    exp: exp
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = createSignature(data, secret);

  return `${data}.${signature}`;
}

/**
 * JWT token verification
 * @param {string} token - Bearer token or JWT token
 * @param {string} secret - Secret key (required)
 * @returns {Object|null} Decoded payload or null if invalid
 * @throws {TypeError} If no secret is given
 */
export function verifyToken(token, secret) {
  requireSecret(secret, 'verifyToken(token, secret) was called without a secret');

  try {
    let jwtToken = token;
    
    // Handle Bearer token format
    if (token && token.startsWith('Bearer ')) {
      jwtToken = token.slice(7);
    }
    
    if (!jwtToken) {
      return null;
    }

    // Split JWT into parts
    const parts = jwtToken.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify signature
    const data = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = createSignature(data, secret);
    
    if (signature !== expectedSignature) {
      return null;
    }

    // Decode and parse payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Token expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Authentication middleware
 *
 * Verifies the `Authorization: Bearer <jwt>` header with `options.secret`, or
 * hands the request to `options.verify` for any other scheme. One of the two
 * is required: there is no default secret.
 *
 * @param {Object} options - Auth options
 * @param {string|Buffer} [options.secret] - HS256 secret the tokens were signed with
 * @param {Function} [options.verify] - `(req) => user | null`, may be async; replaces JWT verification
 * @param {boolean} [options.required=true] - Answer 401 when no valid user is found
 * @returns {Function} Middleware function
 * @throws {TypeError} If neither `secret` nor `verify` is given
 */
export function withAuth(options = {}) {
  const { secret, verify, required = true } = options ?? {};

  const reject = (res) => {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
  };

  if (verify !== undefined) {
    if (typeof verify !== 'function') {
      throw new TypeError('[coherent.js/api] withAuth({ verify }) expects verify to be a function (req) => user.');
    }
    return async (req, res) => {
      let user = null;
      try {
        user = (await verify(req)) || null;
      } catch {
        user = null;
      }
      if (required && !user) {
        reject(res);
        return;
      }
      req.user = user;
      return null; // Continue to next middleware
    };
  }

  requireSecret(secret, 'withAuth({ secret }) was created without a secret');

  return (req, res) => {
    const authHeader = req.headers.authorization;
    const user = verifyToken(authHeader, secret);

    if (required && !user) {
      reject(res);
      return;
    }

    req.user = user;
    return null; // Continue to next middleware
  };
}

/**
 * Authorization middleware
 * @param {string|Array} roles - Required roles
 * @returns {Function} Middleware function
 */
export function withRole(roles) {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res) => {
    if (!req.user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    
    if (!requiredRoles.includes(req.user.role)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    
    return null; // Continue to next middleware
  };
}

/**
 * Password hashing utility
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Password verification utility
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {boolean} True if password matches
 */
export function verifyPassword(password, hashedPassword) {
  try {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  } catch {
    return false;
  }
}

/**
 * Generate secure random token (for non-JWT use cases)
 * @param {number} length - Token length
 * @returns {string} Random token
 */
export function generateToken(length = 32) {
  return randomBytes(length).toString('hex');
}

/**
 * Input validation middleware
 * @param {Object} rules - Validation rules
 * @returns {Function} Middleware function
 */
export function withInputValidation(rules) {
  return (req, res) => {
    const errors = [];
    
    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];
      
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      if (value !== undefined && rule.type && typeof value !== rule.type) {
        errors.push(`${field} must be of type ${rule.type}`);
      }
      
      if (value && rule.minLength && value.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`);
      }
      
      if (value && rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${field} must be at most ${rule.maxLength} characters`);
      }
      
      if (value && rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
    }
    
    if (errors.length > 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Validation failed', details: errors }));
      return;
    }
    
    return null; // Continue to next middleware
  };
}

export default {
  verifyToken,
  generateJWT,
  withAuth,
  withRole,
  hashPassword,
  verifyPassword,
  generateToken,
  withInputValidation
};
