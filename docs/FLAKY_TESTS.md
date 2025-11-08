# Handling Flaky Tests in CI

## Overview

This document explains how flaky tests are handled in the Coherent.js project and how to fix them.

## Automatic Retry Configuration

### Global Retry (vitest.config.js)

All tests automatically retry **2 times** in CI environments:

```javascript
retry: process.env.CI ? 2 : 0
```

- **CI**: Tests retry up to 2 times on failure
- **Local**: No retries (helps catch flakiness during development)

### Per-Test Retry

For specific flaky tests, use test-level configuration:

```javascript
it('flaky test name', { timeout: 20000, retry: 3 }, async () => {
  // Test code
});
```

## Common Flaky Test Patterns & Fixes

### 1. Network/Async Timeout Tests

**Problem**: Tests making real network calls timeout

```javascript
// ❌ BAD - Makes real network call
it('should load asset', async () => {
  const manager = new AssetManager({ baseUrl: 'https://example.com/' });
  await manager.loadAsset('/style.css'); // Times out!
});
```

**Solution**: Mock the network call

```javascript
// ✅ GOOD - Mocked network call
it('should load asset', async () => {
  const manager = new AssetManager({ baseUrl: 'https://example.com/' });
  manager.loadAsset = vi.fn().mockResolvedValue({ loaded: true });
  await manager.loadAsset('/style.css');
});
```

### 2. Timing/Performance Tests

**Problem**: `setTimeout` is not precise, can vary by ±2ms

```javascript
// ❌ BAD - Expects exact 10ms
it('should measure timing', async () => {
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(duration).toBeGreaterThanOrEqual(10); // Fails at 9.32ms!
});
```

**Solution**: Allow timing variance

```javascript
// ✅ GOOD - Allows ±2ms variance
it('should measure timing', async () => {
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(duration).toBeGreaterThanOrEqual(8);  // More lenient
  expect(duration).toBeLessThan(20);
});
```

### 3. Database/Connection Tests

**Problem**: Connection retries take time, can timeout

**Solution**: Increase timeout or skip in CI

```javascript
// Option 1: Increase timeout
it('should retry connection', { timeout: 30000 }, async () => {
  await connectWithRetry();
});

// Option 2: Skip in CI
it.skipIf(process.env.CI)('should retry connection', async () => {
  await connectWithRetry();
});
```

### 4. Race Conditions

**Problem**: Tests depend on execution order

**Solution**: Run sequentially

```javascript
describe.sequential('Database tests', () => {
  it('test 1', async () => { /* ... */ });
  it('test 2', async () => { /* ... */ }); // Runs after test 1
});
```

## Test Options Reference

### Individual Test Options

```javascript
it('test name', {
  timeout: 20000,     // Max time in ms
  retry: 3,           // Number of retries
  concurrent: false,  // Run sequentially
  fails: true,        // Expect failure (for known bugs)
}, async () => {
  // Test code
});
```

### Skip/Only Options

```javascript
it.skip('not ready yet', () => { /* ... */ });
it.skipIf(process.env.CI)('only local', () => { /* ... */ });
it.todo('implement later', () => { /* ... */ });
it.only('debug this one', () => { /* ... */ });
```

## CI Configuration

### GitHub Actions

The CI workflow automatically sets the `CI=true` environment variable:

```yaml
- name: Unit tests with coverage
  run: pnpm run test:coverage
  env:
    CI: true  # Enables retry
```

### Test Reporting

In CI, tests generate detailed reports:

- `test-results/results.json` - Machine-readable results
- `test-results/junit.xml` - JUnit format for CI tools
- Console output shows retry attempts

## Best Practices

### DO ✅

1. **Mock external dependencies** (network, filesystem, timers)
2. **Use lenient timing assertions** (allow ±2ms variance)
3. **Increase timeouts** for slow operations
4. **Investigate root causes** of flakiness
5. **Use retries as a temporary fix** while fixing the real issue

### DON'T ❌

1. **Don't make real network calls** in tests
2. **Don't rely on exact timing** (use ranges instead)
3. **Don't ignore flaky tests** indefinitely
4. **Don't set retry too high** (max 3)
5. **Don't skip tests without a plan** to fix them

## Fixed Flaky Tests

### Runtime: AssetManager Cache Test

**Before**: Timeout after 10s (network call)

**After**: Mocked network call, 20s timeout, 2 retries

Location: `packages/runtime/test/utils.test.js:132`

### Core: Performance Monitor Timing

**Before**: Expected >=10ms, got 9.32ms

**After**: Allow 8-20ms range

Location: `packages/core/test/performance-monitor.test.js:516`

## Monitoring Flaky Tests

Watch for retry messages in CI output:

```
✓ should cache loaded assets (retry 1 of 2) ⏱ 4005ms
```

If you see many retries, investigate:

```bash
# Run tests locally multiple times
pnpm test -- --reporter=verbose --run 10

# Run specific flaky test
pnpm test -- packages/runtime/test/utils.test.js --reporter=verbose
```

## Further Reading

- [Vitest Retry API](https://vitest.dev/api/#retry)
- [Vitest Test Options](https://vitest.dev/api/#test)
- [GitHub Actions CI Best Practices](https://docs.github.com/en/actions/guides/building-and-testing-nodejs)
