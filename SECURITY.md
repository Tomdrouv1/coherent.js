# Security Policy

## Supported Versions

We take security seriously and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x-beta   | :white_check_mark: |
| < 1.0.0 | :x:                |

Currently, only the latest beta version receives security updates. Once we reach stable 1.0.0, we will support the latest stable release.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by emailing:

**[thomas.drouvin@collektivs.com](mailto:thomas.drouvin@collektivs.com)**

Or create a private security advisory:
1. Go to https://github.com/Tomdrouv1/coherent.js/security/advisories
2. Click "Report a vulnerability"
3. Fill out the form with details

### What to Include

When reporting a vulnerability, please include:

- **Description** - A clear description of the vulnerability
- **Impact** - What kind of vulnerability is it? (XSS, injection, etc.)
- **Steps to Reproduce** - Detailed steps to reproduce the issue
- **Affected Versions** - Which versions are affected
- **Proof of Concept** - Sample code or payload demonstrating the issue
- **Suggested Fix** - If you have a suggested fix, please include it

### What to Expect

After submitting a vulnerability report:

- **Initial Response**: Within 48 hours
- **Status Update**: Within 5 business days with our assessment
- **Fix Timeline**: Critical issues will be addressed within 7-14 days
- **Disclosure**: We will coordinate disclosure with you after the fix is released

## Security Best Practices

When using Coherent.js:

### Input Sanitization

Always sanitize user input before rendering:

```javascript
import { sanitizeHtml } from '@coherent.js/core';

// ❌ DON'T: Never use raw user input with html property
const unsafe = {
  div: { html: userInput }  // DANGEROUS!
};

// ✅ DO: Use text property for user input
const safe = {
  div: { text: userInput }  // Automatically escaped
};

// ✅ DO: Sanitize if you must use HTML
const sanitized = {
  div: { html: sanitizeHtml(userInput) }
};
```

### XSS Prevention

The framework provides automatic XSS protection:

- `text` property - Always HTML-escaped
- `html` property - Use with caution, sanitize first
- `className` - Automatically escaped
- Attribute values - Automatically escaped

### SQL Injection (Database Package)

When using `@coherent.js/database`:

```javascript
// ❌ DON'T: Never concatenate user input
const bad = await db.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✅ DO: Use parameterized queries
const good = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
```

### Command Injection (CLI Package)

Never pass unsanitized user input to shell commands:

```javascript
// ❌ DON'T
exec(`build --output ${userInput}`);

// ✅ DO: Validate and sanitize
const allowedPaths = ['/dist', '/build'];
if (allowedPaths.includes(userInput)) {
  exec(`build --output ${userInput}`);
}
```

### Server-Side Request Forgery (SSRF)

When fetching external resources:

```javascript
// ✅ DO: Validate URLs
import { isValidUrl, isSafeUrl } from '@coherent.js/core';

if (isValidUrl(url) && isSafeUrl(url)) {
  const response = await fetch(url);
}
```

## Dependency Security

We actively monitor dependencies for vulnerabilities:

- Regular `pnpm audit` checks in CI/CD
- Automated dependency updates via Dependabot
- Minimal dependency footprint to reduce attack surface

To check your installation:

```bash
pnpm audit
```

## Security Updates

Security updates are released as:

- **Patch versions** for backward-compatible security fixes (1.0.1, 1.0.2)
- **GitHub Security Advisories** for critical vulnerabilities
- **Release notes** clearly marked with `[SECURITY]` tag

Subscribe to releases to get notified:
- Watch the repository on GitHub
- Follow releases: https://github.com/Tomdrouv1/coherent.js/releases

## Scope

### In Scope

The following are in scope for security reports:

- ✅ Cross-Site Scripting (XSS)
- ✅ SQL Injection
- ✅ Command Injection
- ✅ Path Traversal
- ✅ Server-Side Request Forgery (SSRF)
- ✅ Authentication/Authorization bypass
- ✅ Prototype pollution
- ✅ Regular Expression Denial of Service (ReDoS)
- ✅ Sensitive data exposure

### Out of Scope

The following are NOT considered security vulnerabilities:

- ❌ Issues requiring physical access to a user's device
- ❌ Social engineering attacks
- ❌ Denial of Service (DoS) attacks requiring significant resources
- ❌ Issues in third-party dependencies (report to the dependency maintainer)
- ❌ Theoretical vulnerabilities without proof of concept
- ❌ Issues in outdated or unsupported versions

## Responsible Disclosure

We kindly ask security researchers to:

- Give us reasonable time to fix the issue before public disclosure
- Make a good faith effort to avoid privacy violations and data destruction
- Not exploit the vulnerability beyond what is necessary to demonstrate it
- Keep the vulnerability confidential until we've released a fix

We commit to:

- Respond to your report within 48 hours
- Keep you updated on our progress
- Credit you in the security advisory (if you wish)
- Not take legal action against researchers who follow this policy

## Security Contact

- **Email**: thomas.drouvin@collektivs.com
- **GitHub Security Advisories**: https://github.com/Tomdrouv1/coherent.js/security/advisories
- **Response Time**: Within 48 hours

## Hall of Fame

We appreciate security researchers who help keep Coherent.js safe. Contributors who report valid vulnerabilities will be listed here (with permission):

<!-- Security researchers will be listed here -->

---

Thank you for helping keep Coherent.js and its users safe!
