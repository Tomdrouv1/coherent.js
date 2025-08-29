/**
 * Tests for API Security Features
 */

import { describe, it, expect } from 'vitest';
import { 
  withAuth, 
  withRole, 
  withInputValidation, 
  generateToken, 
  generateJWT,
  verifyToken,
  hashPassword, 
  verifyPassword
} from '../../../src/api/security.js';

describe('API Security Functions', () => {
  it('should generate random tokens', () => {
    const token = generateToken(32);
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64); // 32 bytes = 64 hex chars
  });

  it('should generate and verify JWT tokens', () => {
    const jwtPayload = { userId: 123, role: 'user' };
    const jwtToken = generateJWT(jwtPayload, '1h', 'test-secret');
    
    expect(typeof jwtToken).toBe('string');
    expect(jwtToken.split('.').length).toBe(3);
    
    const decoded = verifyToken(jwtToken, 'test-secret');
    expect(decoded).not.toBeNull();
    expect(decoded.userId).toBe(123);
    expect(decoded.role).toBe('user');
  });

  it('should handle invalid JWT tokens', () => {
    const invalidToken = 'invalid.jwt.token';
    const decoded = verifyToken(invalidToken, 'test-secret');
    expect(decoded).toBeNull();
  });

  it('should hash and verify passwords', async () => {
    const password = 'testPassword123';
    const hashedPassword = await hashPassword(password);
    
    expect(typeof hashedPassword).toBe('string');
    expect(hashedPassword).not.toBe(password);
    
    const isValid = await verifyPassword(password, hashedPassword);
    expect(isValid).toBe(true);
    
    const isInvalid = await verifyPassword('wrongPassword', hashedPassword);
    expect(isInvalid).toBe(false);
  });

  it('should create auth middleware', () => {
    const authMiddleware = withAuth();
    expect(typeof authMiddleware).toBe('function');
  });

  it('should create role-based middleware', () => {
    const roleMiddleware = withRole(['admin', 'user']);
    expect(typeof roleMiddleware).toBe('function');
  });

  it('should create input validation middleware', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 }
      },
      required: ['name']
    };

    const validationMiddleware = withInputValidation(schema);
    expect(typeof validationMiddleware).toBe('function');
  });
});