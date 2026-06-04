const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../shared');
const mobileNodeModules = path.resolve(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

// Watch shared/ so Metro picks up changes there
config.watchFolders = [sharedRoot];

// shared/src/* imports zustand, axios, zod — these live in mobile/node_modules,
// but Node's hierarchical lookup walks up from shared/, never reaching mobile/.
// extraNodeModules maps those imports back to mobile/node_modules.
config.resolver.extraNodeModules = new Proxy(
  {
    'util': path.join(mobileNodeModules, 'util'),
  },
  {
    get: (target, name) =>
      name in target ? target[name] : path.join(mobileNodeModules, String(name)),
  }
);

// Enable package.json exports for better tree-shaking (e.g. lucide-react-native subpaths)
config.resolver.unstable_enablePackageExports = true;

// Inline requires reduce TTI by deferring module evaluation
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
