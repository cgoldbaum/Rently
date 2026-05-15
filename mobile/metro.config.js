const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../shared');

const config = getDefaultConfig(projectRoot);

// Watch shared/ so Metro picks up changes there
config.watchFolders = [sharedRoot];

// shared/src/* imports zustand, axios, zod — these live in mobile/node_modules,
// but Node's hierarchical lookup walks up from shared/, never reaching mobile/.
// extraNodeModules maps those imports back to mobile/node_modules.
const mobileNodeModules = path.resolve(projectRoot, 'node_modules');
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_target, name) => path.join(mobileNodeModules, name),
  }
);

module.exports = config;
