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
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Expiration time (e.g., '1h', '30m', '7d')
 * @param {string} secret - Secret key
 * @returns {string} JWT token
 */
export function generateJWT(payload, expiresIn = '1h', secret = 'your-secret-key') {
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
 * @param {string} secret - Secret key
 * @returns {Object|null} Decoded payload or null if invalid
 */
export function verifyToken(token, secret = 'your-secret-key') {
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
 * @param {Object} options - Auth options
 * @returns {Function} Middleware function
 */
export function withAuth(options = {}) {
  const { secret, required = true } = options;
  
  return (req, res) => {
    const authHeader = req.headers.authorization;
    const user = verifyToken(authHeader, secret);
    
    if (required && !user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
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
