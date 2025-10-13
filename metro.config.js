const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional file extensions
config.resolver.sourceExts.push('cjs');

// Configure resolver to handle module resolution
config.resolver = {
  ...config.resolver,
  alias: {
    // Add any aliases if needed
  },
  // Ensure proper module resolution
  platforms: ['ios', 'android', 'native', 'web'],
};

// Configure watcher to ignore problematic directories
config.watchFolders = config.watchFolders || [];
config.watchFolders = config.watchFolders.filter(folder => 
  !folder.includes('.zego-uikit-rn-') && 
  !folder.includes('FQbFAhPG')
);

// Add blacklist for problematic paths
config.resolver.blacklistRE = /.*\/node_modules\/@zegocloud\/\.zego-uikit-rn-.*\/.*/;

module.exports = config;
