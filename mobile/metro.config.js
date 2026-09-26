// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// `@shared/*` -> ../shared (theme tokens + mail data layer shared with web).
// tsconfig paths alone don't resolve outside the project root.
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
