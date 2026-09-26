/**
 * Transaction isolation levels shared by the SQL adapters.
 */

const ISOLATION_LEVELS = ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'];

/**
 * Validate an isolation level before it is written into a BEGIN / SET TRANSACTION statement.
 *
 * @param {string|null|undefined} level - Requested level, any case
 * @returns {string|null} The canonical level, or null when none was requested
 * @throws {Error} If the level is not one of the four standard levels
 */
export function normalizeIsolationLevel(level) {
  if (level === undefined || level === null || level === '') {
    return null;
  }

  const normalized = String(level).trim().replace(/\s+/g, ' ').toUpperCase();
  if (!ISOLATION_LEVELS.includes(normalized)) {
    throw new Error(`Invalid transaction isolation level: ${JSON.stringify(level)}. Use one of: ${ISOLATION_LEVELS.join(', ')}`);
  }
  return normalized;
}
