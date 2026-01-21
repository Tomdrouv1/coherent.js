/**
 * State serialization utilities for Coherent.js hydration
 *
 * Uses base64 encoding to safely embed state in data attributes
 * without escaping issues.
 */

/**
 * Serialize component state to base64-encoded JSON string
 *
 * @param {Object} state - Component state object
 * @returns {string|null} - Base64 encoded state or null if empty/invalid
 */
export function serializeState(state) {
  if (!state || typeof state !== 'object') return null;

  // Filter out non-serializable values (functions, symbols, undefined)
  const serializable = {};
  let hasSerializable = false;

  for (const [key, value] of Object.entries(state)) {
    if (isSerializable(value)) {
      serializable[key] = value;
      hasSerializable = true;
    }
    // Silently omit functions, symbols, undefined - they reconstruct on hydrate
  }

  if (!hasSerializable) return null;

  try {
    const json = JSON.stringify(serializable);
    // Use encodeURIComponent to handle unicode, then btoa for base64
    return btoa(encodeURIComponent(json));
  } catch (e) {
    console.warn('[Coherent.js] Failed to serialize state:', e);
    return null;
  }
}

/**
 * Deserialize state from base64-encoded JSON string
 *
 * @param {string} encoded - Base64 encoded state string
 * @returns {Object|null} - Deserialized state or null if invalid
 */
export function deserializeState(encoded) {
  if (!encoded || typeof encoded !== 'string') return null;

  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json);
  } catch (e) {
    console.warn('[Coherent.js] Failed to deserialize state:', e);
    return null;
  }
}

/**
 * Extract state from a DOM element's data-state attribute
 *
 * @param {HTMLElement} element - DOM element to extract state from
 * @returns {Object|null} - Extracted state or null
 */
export function extractState(element) {
  if (!element || typeof element.getAttribute !== 'function') {
    return null;
  }

  const encoded = element.getAttribute('data-state');
  return deserializeState(encoded);
}

/**
 * Check if a value is serializable to JSON
 * @private
 */
function isSerializable(value) {
  if (value === undefined) return false;
  if (value === null) return true;
  if (typeof value === 'function') return false;
  if (typeof value === 'symbol') return false;
  if (typeof value === 'bigint') return false; // BigInt not JSON serializable

  // Arrays and objects need recursive check
  if (Array.isArray(value)) {
    return value.every(isSerializable);
  }

  if (typeof value === 'object') {
    // Check for circular references would be expensive here
    // JSON.stringify will catch them in serializeState
    return true;
  }

  return true; // primitives (string, number, boolean)
}

/**
 * Size warning threshold (bytes)
 * Warn if serialized state exceeds this
 */
const STATE_SIZE_WARNING_THRESHOLD = 10 * 1024; // 10KB

/**
 * Serialize state with size warning
 *
 * @param {Object} state - Component state
 * @param {string} componentName - Component name for warning message
 * @returns {string|null} - Serialized state
 */
export function serializeStateWithWarning(state, componentName = 'Unknown') {
  const encoded = serializeState(state);

  if (encoded && encoded.length > STATE_SIZE_WARNING_THRESHOLD) {
    console.warn(
      `[Coherent.js] Large state detected for component "${componentName}": ` +
      `${Math.round(encoded.length / 1024)}KB. Consider using a state management ` +
      `solution for large datasets.`
    );
  }

  return encoded;
}
