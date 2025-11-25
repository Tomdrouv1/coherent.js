# Security Policy

## Supported Versions

We currently support the following versions of Coherent.js with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| 0.x.x   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Coherent.js, please follow these steps:

1. **Do not create a public issue** - Security vulnerabilities should be reported privately.

2. **Email us directly** at thomas.drouvin@gmail.com with the following information:
   - A description of the vulnerability
   - Steps to reproduce the vulnerability
   - Potential impact of the vulnerability
   - Any possible mitigations you've identified

3. **Give us a reasonable amount of time** to address the vulnerability before disclosing it publicly.

4. **Coordinate with us** on the disclosure timeline to ensure our users have time to update.

## Security Updates

When security vulnerabilities are discovered and addressed, we will:
- Release a new version with the fix as soon as possible
- Clearly indicate in the release notes that the update addresses a security issue
- Credit the reporter (with their permission) in the release notes

## Security Considerations

Coherent.js includes several built-in security features:
- Automatic HTML escaping to prevent XSS attacks
- Safe attribute handling
- Validation utilities for input sanitization

We recommend all users:
- Keep their Coherent.js version up to date
- Follow secure coding practices when building applications
- Review the security documentation in our guides

## Known Dependency Vulnerabilities

We continuously monitor our dependencies for security vulnerabilities. Below are currently known issues:

### fast-redact (Low Severity) - Accepted Risk

**Status**: No fix available
**Severity**: Low
**CVE**: [GHSA-ffrw-9mx8-89p8](https://github.com/advisories/GHSA-ffrw-9mx8-89p8)
**Affected**: fast-redact <=3.5.0 (transitive dependency via fastify > pino > fast-redact)
**Description**: Prototype pollution vulnerability in nestedRestore function
**Impact**: Potential DoS when processing crafted payloads
**Mitigation**:
- Latest version (3.5.0) is still affected
- No patched version available yet ("Patched versions: <0.0.0")
- Risk is low as it requires crafted input to exploit
- Fastify/Pino teams are aware and working on a solution
- We will update as soon as a patched version is released

**Why we accept this risk**:
- Low severity (requires specific crafted input)
- Server-side code with controlled inputs
- No alternative available without removing Fastify support
- Benefits of Fastify integration outweigh the low risk

To exclude low-severity vulnerabilities from audits, we set `audit-level=high` in `.npmrc`.

## Contact

For any security-related questions or concerns, please contact thomas.drouvin@gmail.com.
