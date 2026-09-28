const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const sharedDir = path.resolve(__dirname, '../shared');
config.watchFolders = [...(config.watchFolders ?? []), sharedDir];

const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@shared/')) {
    const target = path.join(sharedDir, moduleName.slice('@shared/'.length));
    return context.resolveRequest(context, target, platform);
  }
  return (upstreamResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
