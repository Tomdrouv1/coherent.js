/**
 * API Serialization for Coherent.js
 * @fileoverview Utilities for serializing complex data types
 */

/**
 * Serialize a Date object to ISO string
 * @param {Date} date - Date to serialize
 * @returns {string} ISO date string
 */
function serializeDate(date) {
  if (!(date instanceof Date)) {
    throw new Error('Expected Date object');
  }
  return date.toISOString();
}

/**
 * Deserialize an ISO date string to Date object
 * @param {string} dateString - ISO date string
 * @returns {Date} Date object
 */
function deserializeDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date string');
  }
  return date;
}

/**
 * Serialize a Map to plain object
 * @param {Map} map - Map to serialize
 * @returns {Object} Plain object
 */
function serializeMap(map) {
  if (!(map instanceof Map)) {
    throw new Error('Expected Map object');
  }
  
  const obj = {};
  for (const [key, value] of map) {
    obj[key] = value;
  }
  return obj;
}

/**
 * Deserialize a plain object to Map
 * @param {Object} obj - Plain object
 * @returns {Map} Map object
 */
function deserializeMap(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error('Expected plain object');
  }
  
  return new Map(Object.entries(obj));
}

/**
 * Serialize a Set to array
 * @param {Set} set - Set to serialize
 * @returns {Array} Array
 */
function serializeSet(set) {
  if (!(set instanceof Set)) {
    throw new Error('Expected Set object');
  }
  
  return Array.from(set);
}

/**
 * Deserialize an array to Set
 * @param {Array} arr - Array
 * @returns {Set} Set object
 */
function deserializeSet(arr) {
  if (!Array.isArray(arr)) {
    throw new Error('Expected array');
  }
  
  return new Set(arr);
}

/**
 * Create serialization middleware
 * @param {Object} options - Serialization options
 * @param {boolean} [options.enableDate=true] - Include Date helpers
 * @param {boolean} [options.enableMap=true] - Include Map helpers
 * @param {boolean} [options.enableSet=true] - Include Set helpers
 * @param {Object} [options.custom] - Custom serializer/deserializer overrides
 * @param {(d: Date) => any} [options.custom.serializeDate]
 * @param {(v: any) => Date} [options.custom.deserializeDate]
 * @param {(m: Map) => any} [options.custom.serializeMap]
 * @param {(v: any) => Map} [options.custom.deserializeMap]
 * @param {(s: Set) => any} [options.custom.serializeSet]
 * @param {(v: any) => Set} [options.custom.deserializeSet]
 * @returns {Function} Middleware function
 */
function withSerialization(options = {}) {
  const {
    enableDate = true,
    enableMap = true,
    enableSet = true,
    custom = {}
  } = options;

  return (req, res, next) => {
    // Build serialization helpers, honoring options/custom overrides
    res.serialize = {};
    req.deserialize = {};

    if (enableDate) {
      res.serialize.date = custom.serializeDate || serializeDate;
      req.deserialize.date = custom.deserializeDate || deserializeDate;
    }
    if (enableMap) {
      res.serialize.map = custom.serializeMap || serializeMap;
      req.deserialize.map = custom.deserializeMap || deserializeMap;
    }
    if (enableSet) {
      res.serialize.set = custom.serializeSet || serializeSet;
      req.deserialize.set = custom.deserializeSet || deserializeSet;
    }

    next();
  };
}

/**
 * Serialize complex data for JSON
 * @param {any} data - Data to serialize
 * @returns {any} Serialized data
 */
function serializeForJSON(data) {
  if (data instanceof Date) {
    return serializeDate(data);
  }
  
  if (data instanceof Map) {
    return serializeMap(data);
  }
  
  if (data instanceof Set) {
    return serializeSet(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => serializeForJSON(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const serialized = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeForJSON(value);
    }
    return serialized;
  }
  
  return data;
}

// Export serialization utilities
export {
  serializeDate,
  deserializeDate,
  serializeMap,
  deserializeMap,
  serializeSet,
  deserializeSet,
  withSerialization,
  serializeForJSON
};

export default {
  serializeDate,
  deserializeDate,
  serializeMap,
  deserializeMap,
  serializeSet,
  deserializeSet,
  withSerialization,
  serializeForJSON
};
