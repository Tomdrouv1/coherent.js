# Security Policy

## Supported Versions

We support the current major version of Coherent.js with security updates. 

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | ✅ (Current)       |
| < 0.2   | ❌ (Not supported) |

## Security Features

Coherent.js includes several built-in security features:

### HTML Escaping
- **Automatic HTML escaping**: All text content is automatically escaped to prevent XSS attacks
- **Safe attribute handling**: Attributes are properly escaped and validated
- **Void element validation**: Prevents malformed HTML that could lead to security issues

### Input Validation
- **Schema-based validation**: API endpoints use JSON Schema validation
- **Type checking**: TypeScript definitions help prevent type-related vulnerabilities
- **Parameter sanitization**: Input parameters are validated and sanitized

### Dependencies
- **Minimal dependencies**: Core package has zero runtime dependencies
- **Regular updates**: Dependencies are regularly updated to latest secure versions
- **Peer dependency management**: Optional dependencies reduce attack surface

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities to:
- **Email**: thomas.drouvin@gmail.com
- **Subject**: [SECURITY] Coherent.js Security Report

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes

## Response Timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Fix timeline**: Depends on severity
  - Critical: Within 24-48 hours
  - High: Within 1 week
  - Medium: Within 2 weeks
  - Low: Next regular release

## Security Best Practices

### For Users

1. **Keep Updated**: Always use the latest version of Coherent.js
2. **Validate Input**: Always validate user input before processing
3. **Escape Output**: Use the built-in text property for user content
4. **Review Dependencies**: Regularly audit your dependencies
5. **Use HTTPS**: Always serve your applications over HTTPS

### For Developers

1. **Code Review**: All changes go through code review
2. **Security Testing**: Include security tests in your test suite
3. **Static Analysis**: Use ESLint rules to catch common security issues
4. **Dependency Scanning**: Regularly scan dependencies for vulnerabilities

## Common Vulnerabilities Prevention

### XSS Prevention
```javascript
// ✅ Safe - automatically escaped
{ p: { text: userInput } }

// ❌ Unsafe - raw HTML
{ p: { html: userInput } } // Only use with trusted content
```

### SQL Injection Prevention
```javascript
// ✅ Safe - parameterized queries
const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

// ❌ Unsafe - string concatenation
const user = await db.query(`SELECT * FROM users WHERE id = ${userId}`);
```

### Path Traversal Prevention
```javascript
// ✅ Safe - validate paths
const safePath = path.join(publicDir, path.normalize(userPath));
if (!safePath.startsWith(publicDir)) {
  throw new Error('Invalid path');
}

// ❌ Unsafe - direct path usage
const unsafePath = publicDir + userPath;
```

## Security Headers

When deploying Coherent.js applications, consider these security headers:

```javascript
// Express.js example
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

## Acknowledgments

We thank the security research community for responsible disclosure of vulnerabilities. Contributors will be acknowledged unless they prefer to remain anonymous.

## Contact

For security-related questions or concerns:
- Email: thomas.drouvin@gmail.com
- GitHub: [@Tomdrouv1](https://github.com/Tomdrouv1)

---

*This security policy is effective as of January 2025 and may be updated periodically.*