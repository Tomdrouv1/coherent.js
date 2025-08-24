# Coherent.js API Security Guide

This guide covers the comprehensive security features built into the Coherent.js API framework and best practices for secure API development.

## Table of Contents

- [Built-in Security Features](#built-in-security-features)
- [Authentication & Authorization](#authentication--authorization)
- [Input Validation & Sanitization](#input-validation--sanitization)
- [Rate Limiting & DoS Protection](#rate-limiting--dos-protection)
- [Security Headers](#security-headers)
- [CORS Configuration](#cors-configuration)
- [Request Size Limits](#request-size-limits)
- [Password Security](#password-security)
- [Security Best Practices](#security-best-practices)
- [Common Vulnerabilities Prevention](#common-vulnerabilities-prevention)

## Built-in Security Features

The Coherent.js API framework includes enterprise-grade security features out of the box:

- **Automatic Security Headers** - CORS, XSS protection, content type sniffing prevention
- **Rate Limiting** - IP-based request throttling with configurable windows
- **Input Sanitization** - XSS prevention and prototype pollution protection
- **Request Size Limits** - Protection against large payload attacks
- **Authentication Middleware** - JWT-based authentication with role support
- **Input Validation** - JSON Schema validation with security considerations

## Authentication & Authorization

### JWT Token Authentication

```javascript
const { withAuth, withRole, generateToken } = require('../src/api/security');

// Generate tokens
const token = generateToken({
  userId: 123,
  username: 'john_doe',
  role: 'user',
  permissions: ['read', 'write']
}, '24h'); // Token expires in 24 hours

// Protected routes
const routes = {
  api: {
    profile: {
      GET: {
        middleware: [withAuth],
        handler: async (req, res) => {
          // req.user contains decoded token data
          return { user: req.user };
        }
      }
    },
    admin: {
      GET: {
        middleware: [withAuth, withRole('admin')],
        handler: async (req, res) => {
          return { message: 'Admin access granted' };
        }
      }
    }
  }
};
```

### Custom Authentication

```javascript
const customAuth = async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || !await validateApiKey(apiKey)) {
    res.statusCode = 401;
    throw new Error('Invalid API key');
  }
  
  req.user = await getUserByApiKey(apiKey);
};

const routes = {
  api: {
    data: {
      GET: {
        middleware: [customAuth],
        handler: async (req, res) => {
          return { data: 'Protected data' };
        }
      }
    }
  }
};
```

## Input Validation & Sanitization

### JSON Schema Validation

```javascript
const { withValidation } = require('../src/api/security');

const userSchema = {
  type: 'object',
  properties: {
    username: {
      type: 'string',
      minLength: 3,
      maxLength: 30,
      pattern: '^[a-zA-Z0-9_]+$' // Alphanumeric and underscore only
    },
    email: {
      type: 'string',
      format: 'email',
      maxLength: 255
    },
    age: {
      type: 'integer',
      minimum: 13,
      maximum: 120
    }
  },
  required: ['username', 'email'],
  additionalProperties: false // Prevent extra properties
};

const routes = {
  api: {
    users: {
      POST: {
        middleware: [withValidation(userSchema)],
        handler: async (req, res) => {
          // req.body is validated and sanitized
          return { success: true, user: req.body };
        }
      }
    }
  }
};
```

### Custom Validation

```javascript
const validateUserInput = async (req, res) => {
  const { username, email } = req.body;
  
  // Custom validation logic
  if (await userExists(username)) {
    res.statusCode = 409;
    throw new Error('Username already exists');
  }
  
  if (await isEmailBlacklisted(email)) {
    res.statusCode = 400;
    throw new Error('Email domain not allowed');
  }
};

const routes = {
  api: {
    register: {
      POST: {
        middleware: [withValidation(userSchema), validateUserInput],
        handler: async (req, res) => {
          return await createUser(req.body);
        }
      }
    }
  }
};
```

## Rate Limiting & DoS Protection

### Basic Rate Limiting

```javascript
const server = router.createServer({
  rateLimit: {
    windowMs: 60000, // 1 minute window
    maxRequests: 100 // 100 requests per minute per IP
  }
});
```

### Advanced Rate Limiting

```javascript
// Different limits for different endpoints
const rateLimitConfig = {
  '/api/login': { windowMs: 300000, maxRequests: 5 }, // 5 login attempts per 5 minutes
  '/api/upload': { windowMs: 60000, maxRequests: 10 }, // 10 uploads per minute
  '/api/search': { windowMs: 60000, maxRequests: 1000 } // 1000 searches per minute
};

// Custom rate limiting middleware
const customRateLimit = (endpoint) => {
  const config = rateLimitConfig[endpoint] || { windowMs: 60000, maxRequests: 100 };
  
  return async (req, res) => {
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    if (!checkRateLimit(clientIP, config.windowMs, config.maxRequests)) {
      res.statusCode = 429;
      throw new Error('Too Many Requests');
    }
  };
};
```

## Security Headers

### Default Security Headers

The framework automatically adds these security headers:

```javascript
// Automatically added to all responses:
{
  'Access-Control-Allow-Origin': 'http://localhost:3000', // Configurable
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self'"
}
```

### Custom Security Headers

```javascript
const addCustomHeaders = async (req, res) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
};

const routes = {
  api: {
    secure: {
      GET: {
        middleware: [addCustomHeaders],
        handler: async (req, res) => {
          return { message: 'Secure endpoint' };
        }
      }
    }
  }
};
```

## CORS Configuration

### Basic CORS Setup

```javascript
const server = router.createServer({
  corsOrigin: 'https://yourdomain.com' // Single origin
});
```

### Multiple Origins

```javascript
const server = router.createServer({
  corsOrigin: [
    'https://app.yourdomain.com',
    'https://admin.yourdomain.com',
    'https://mobile.yourdomain.com'
  ]
});
```

### Dynamic CORS

```javascript
const dynamicCors = async (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = await getAllowedOrigins(); // From database
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
};
```

## Request Size Limits

### Basic Size Limits

```javascript
const server = router.createServer({
  maxBodySize: 5 * 1024 * 1024 // 5MB limit
});
```

### Endpoint-Specific Limits

```javascript
const checkFileUploadSize = async (req, res) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 50 * 1024 * 1024; // 50MB for file uploads
  
  if (contentLength > maxSize) {
    res.statusCode = 413;
    throw new Error('File too large');
  }
};

const routes = {
  api: {
    upload: {
      POST: {
        middleware: [checkFileUploadSize],
        handler: async (req, res) => {
          return await handleFileUpload(req.body);
        }
      }
    }
  }
};
```

## Password Security

### Password Hashing

```javascript
const { hashPassword, verifyPassword } = require('../src/api/security');

// Registration
const registerUser = async (req, res) => {
  const { username, password } = req.body;
  
  // Hash password before storing
  const hashedPassword = await hashPassword(password);
  
  const user = await createUser({
    username,
    password: hashedPassword
  });
  
  return { success: true, userId: user.id };
};

// Login
const loginUser = async (req, res) => {
  const { username, password } = req.body;
  
  const user = await getUserByUsername(username);
  if (!user || !await verifyPassword(password, user.password)) {
    res.statusCode = 401;
    throw new Error('Invalid credentials');
  }
  
  const token = generateToken({ userId: user.id, username });
  return { token, user: { id: user.id, username } };
};
```

### Password Policies

```javascript
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (password.length < minLength) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    throw new Error('Password must contain uppercase, lowercase, numbers, and special characters');
  }
};
```

## Security Best Practices

### 1. Input Validation

- Always validate and sanitize user input
- Use JSON Schema for structured validation
- Implement whitelist-based validation
- Reject unexpected data structures

### 2. Authentication

- Use strong JWT secrets (256-bit minimum)
- Implement token expiration
- Use refresh tokens for long-lived sessions
- Store sensitive data server-side only

### 3. Authorization

- Implement role-based access control
- Use principle of least privilege
- Validate permissions on every request
- Audit access patterns regularly

### 4. Data Protection

- Hash passwords with salt
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Implement proper session management

### 5. Error Handling

- Don't expose internal errors to clients
- Log security events for monitoring
- Implement proper error responses
- Use consistent error formats

### 6. Monitoring

- Log authentication attempts
- Monitor rate limiting triggers
- Track unusual access patterns
- Set up security alerts

## Common Vulnerabilities Prevention

### SQL Injection Prevention

```javascript
// Use parameterized queries
const getUserById = async (id) => {
  // Good: Parameterized query
  return await db.query('SELECT * FROM users WHERE id = ?', [id]);
  
  // Bad: String concatenation
  // return await db.query(`SELECT * FROM users WHERE id = ${id}`);
};
```

### XSS Prevention

```javascript
// Input sanitization is automatic, but for HTML content:
const sanitizeHtml = (html) => {
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};
```

### CSRF Prevention

```javascript
const csrfProtection = async (req, res) => {
  const token = req.headers['x-csrf-token'];
  const sessionToken = req.session?.csrfToken;
  
  if (!token || token !== sessionToken) {
    res.statusCode = 403;
    throw new Error('Invalid CSRF token');
  }
};
```

### Prototype Pollution Prevention

```javascript
// Automatic sanitization prevents prototype pollution
// But for additional safety:
const safeObjectAssign = (target, source) => {
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  
  Object.keys(source).forEach(key => {
    if (!dangerousKeys.includes(key)) {
      target[key] = source[key];
    }
  });
  
  return target;
};
```

## Security Testing

### Testing Security Features

```javascript
// Example security test
const testSecurity = async () => {
  // Test rate limiting
  const responses = await Promise.all(
    Array(110).fill().map(() => fetch('/api/test'))
  );
  const rateLimited = responses.some(r => r.status === 429);
  console.log('Rate limiting:', rateLimited ? 'PASS' : 'FAIL');
  
  // Test XSS protection
  const xssPayload = { name: '<script>alert("xss")</script>' };
  const xssResponse = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(xssPayload)
  });
  console.log('XSS protection:', xssResponse.ok ? 'PASS' : 'FAIL');
  
  // Test authentication
  const protectedResponse = await fetch('/api/protected');
  console.log('Auth protection:', protectedResponse.status === 401 ? 'PASS' : 'FAIL');
};
```

## Conclusion

The Coherent.js API framework provides comprehensive security features out of the box, but security is a shared responsibility. Always:

1. Keep the framework updated
2. Follow security best practices
3. Regularly audit your code
4. Monitor security logs
5. Test security features
6. Stay informed about new threats

For additional security questions or to report vulnerabilities, please refer to the project's security policy.
