const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')

// Get the default Metro config from Expo first
module.exports = async () => {
  const config = getDefaultConfig(projectRoot)

  const defaultWatch = Array.isArray(config.watchFolders) ? config.watchFolders : []
  config.watchFolders = Array.from(new Set([...defaultWatch, workspaceRoot]))

  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ]

  // Force tailwindcss to resolve from expo/node_modules
  config.resolver.extraNodeModules = {
    ...(config.resolver.extraNodeModules || {}),
    tailwindcss: path.resolve(projectRoot, 'node_modules', 'tailwindcss'),
  }

  return withUniwindConfig(config, {
    // relative path to your global.css file
    cssEntryFile: './global.css',
    // generate type definitions for className usage
    dtsFile: './uniwind-types.d.ts',
    polyfills: {
      // keep rem close to previous NativeWind inlineRem = 16
      rem: 16,
    },
  });
};