/**
 * Loads the element data extracted at build time from
 * packages/core/types/elements.d.ts (scripts/extract-attributes.ts).
 *
 * Kept in its own module so a bundler can swap it for one with the data
 * inlined: the VS Code extension bundles the server into a single file,
 * with no JSON file next to it at runtime.
 */

import { createRequire } from 'module';
import type { ExtractedData } from './element-attributes.js';

/**
 * @returns The generated data, or null when it has not been generated
 *   (a development checkout before the first build).
 */
export function loadGeneratedData(): ExtractedData | null {
  try {
    return createRequire(import.meta.url)('./element-attributes.generated.json') as ExtractedData;
  } catch {
    return null;
  }
}
