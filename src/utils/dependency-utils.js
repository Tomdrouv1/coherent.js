/**
 * Utility functions for handling optional peer dependencies
 */

/**
 * Check if a peer dependency is available
 * @param {string} packageName - Name of the package to check
 * @returns {boolean} - Whether the package is available
 */
export function isPeerDependencyAvailable(packageName) {
  try {
    // Try to resolve the package
    import.meta.resolve(packageName);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Dynamically import a peer dependency with error handling
 * @param {string} packageName - Name of the package to import
 * @param {string} integrationName - Human-readable name of the integration
 * @returns {Promise<any>} - The imported module
 * @throws {Error} - If the dependency is not available
 */
export async function importPeerDependency(packageName, integrationName) {
  try {
    return await import(packageName);
  } catch (error) {
    throw new Error(
      `${integrationName} integration requires the '${packageName}' package to be installed.\n` +
      `Please install it with: npm install ${packageName}\n` +
      `Or with pnpm: pnpm add ${packageName}\n` +
      `Or with yarn: yarn add ${packageName}`
    );
  }
}

/**
 * Create a lazy-loaded integration that only imports dependencies when needed
 * @param {string} packageName - Name of the package to import
 * @param {string} integrationName - Human-readable name of the integration
 * @param {Function} createIntegration - Function that creates the integration using the imported package
 * @returns {Function} - Lazy-loaded integration function
 */
export function createLazyIntegration(packageName, integrationName, createIntegration) {
  let cachedIntegration = null;
  let importPromise = null;

  return async function(...args) {
    // Return cached integration if available
    if (cachedIntegration) {
      return cachedIntegration(...args);
    }

    // Avoid multiple concurrent imports
    if (!importPromise) {
      importPromise = importPeerDependency(packageName, integrationName)
        .then(module => {
          cachedIntegration = createIntegration(module);
          return cachedIntegration;
        });
    }

    const integration = await importPromise;
    return integration(...args);
  };
}

/**
 * Check multiple peer dependencies and provide helpful error messages
 * @param {Array<{package: string, integration: string}>} dependencies - List of dependencies to check
 * @returns {Object} - Object with availability status for each dependency
 */
export function checkPeerDependencies(dependencies) {
  const results = {};
  const missing = [];

  for (const { package: packageName, integration } of dependencies) {
    const available = isPeerDependencyAvailable(packageName);
    results[packageName] = available;
    
    if (!available) {
      missing.push({ package: packageName, integration });
    }
  }

  if (missing.length > 0) {
    const installCommands = missing.map(({ package: pkg }) => pkg).join(' ');
    const integrationsList = missing.map(({ integration }) => integration).join(', ');
    
    console.warn(
      `Optional dependencies missing for ${integrationsList} integration(s).\n` +
      `To use these integrations, install: npm install ${installCommands}\n` +
      `Or with pnpm: pnpm add ${installCommands}\n` +
      `Or with yarn: yarn add ${installCommands}`
    );
  }

  return results;
}

/**
 * Create a function that checks for a dependency before executing
 * @param {string} packageName - Name of the package required
 * @param {string} integrationName - Human-readable name of the integration
 * @param {Function} fn - Function to execute if dependency is available
 * @returns {Function} - Wrapped function with dependency check
 */
export function requirePeerDependency(packageName, integrationName, fn) {
  return function(...args) {
    if (!isPeerDependencyAvailable(packageName)) {
      throw new Error(
        `${integrationName} integration requires the '${packageName}' package to be installed.\n` +
        `Please install it with: npm install ${packageName}`
      );
    }
    return fn.apply(this, args);
  };
}
