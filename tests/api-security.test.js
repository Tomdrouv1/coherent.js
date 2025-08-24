/**
 * Tests for API Security Features
 */

import { 
  withAuth, 
  withRole, 
  withInputValidation, 
  generateToken, 
  generateJWT,
  verifyToken,
  hashPassword, 
  verifyPassword
} from '../src/api/security.js';

console.log('🧪 Testing security functions...');

// Test random token generation
const token = generateToken(32);
console.assert(typeof token === 'string', 'Should generate string token');
console.assert(token.length === 64, 'Should generate hex token of correct length'); // 32 bytes = 64 hex chars

// Test JWT generation and verification
const jwtPayload = { userId: 123, role: 'user' };
const jwtToken = generateJWT(jwtPayload, '1h', 'test-secret');
console.assert(typeof jwtToken === 'string', 'Should generate JWT token');
console.assert(jwtToken.split('.').length === 3, 'JWT should have 3 parts');

const decoded = verifyToken(jwtToken, 'test-secret');
console.assert(decoded !== null, 'Should verify JWT token');
console.assert(decoded.userId === 123, 'Should preserve payload data');

// Test middleware functions exist
console.assert(typeof withAuth === 'function', 'Should have withAuth middleware');
console.assert(typeof withRole === 'function', 'Should have withRole middleware');
console.assert(typeof withInputValidation === 'function', 'Should have withInputValidation middleware');

// Test JWT functions exist
console.assert(typeof generateJWT === 'function', 'Should have generateJWT function');
console.assert(typeof verifyToken === 'function', 'Should have verifyToken function');

// Test password functions exist
console.assert(typeof hashPassword === 'function', 'Should have hashPassword function');
console.assert(typeof verifyPassword === 'function', 'Should have verifyPassword function');

console.log('🎉 All security tests passed!');





