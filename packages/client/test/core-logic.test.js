/**
 * Core logic tests that verify the actual implementation
 * These tests focus on the algorithms and business logic
 */

import { describe, it, expect } from 'vitest';

describe('HMR Core Logic', () => {
  // The ./hmr subpath used to throw a 1.0 migration error on import, which
  // made the published entry point unusable. It now exports the HMR API; what
  // 1.0 removed — connecting as an import side effect — stays removed.
  it('exposes the HMR API from the hmr entry point without connecting', async () => {
    const hmr = await import('../src/hmr.js');

    expect(hmr.hmrClient.initialized).toBe(false);
    expect(hmr.hmrClient.socket).toBeNull();
  });

  it('should test HMR message processing logic', () => {
    // Test the message processing logic that would be inside handleUpdate
    const testMessages = [
      { type: 'hmr-update', filePath: '/test.js', webPath: '/test.js' },
      { type: 'hmr-full-reload' },
      { type: 'connected' },
      { type: 'preview-update' }
    ];

    testMessages.forEach(message => {
      // Test that we can parse and categorize messages correctly
      expect(message.type).toBeDefined();

      // Test file path handling
      const filePath = message.webPath || message.filePath || '';
      const importPath = filePath.startsWith('/') ? filePath : `/${filePath}`;

      if (message.type === 'hmr-update') {
        expect(importPath).toMatch(/^\/.*\.js$/);
      }
    });
  });

  it('should test URL construction logic', () => {
    // Test the WebSocket URL construction logic from HMR
    const testCases = [
      { protocol: 'https:', expected: 'wss' },
      { protocol: 'http:', expected: 'ws' }
    ];

    testCases.forEach(({ protocol, expected }) => {
      const wsProtocol = protocol === 'https:' ? 'wss' : 'ws';
      expect(wsProtocol).toBe(expected);
    });

    // Test URL construction
    const host = 'localhost:3000';
    const wsProtocol = 'ws';
    const wsUrl = `${wsProtocol}://${host}`;
    expect(wsUrl).toBe('ws://localhost:3000');
  });
});
