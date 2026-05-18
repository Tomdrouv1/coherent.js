/**
 * pnpm resolution hook.
 *
 * Pins certain transitive deps to known-good versions, so newly-published
 * patches don't churn the lockfile (or trip local supply-chain policies
 * like minimumReleaseAge that block recently-published packages).
 */

const PINS = {
  // Block transitive bumps to @types/node@25.9.0+ — older versions are
  // fine, newer versions trigger local minimumReleaseAge policy blocks
  // until they age past the cutoff.
  '@types/node': '25.8.0',
};

function pinTransitive(deps) {
  if (!deps) return;
  for (const name of Object.keys(deps)) {
    if (PINS[name]) deps[name] = PINS[name];
  }
}

function readPackage(pkg) {
  pinTransitive(pkg.dependencies);
  pinTransitive(pkg.devDependencies);
  pinTransitive(pkg.peerDependencies);
  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
