import type { ConfigContext, ExpoConfig } from 'expo/config';

const DEVELOPMENT_VARIANT = 'development';
const PRODUCTION_IDENTIFIER = 'com.cristojv.jarling';
const DEVELOPMENT_IDENTIFIER = `${PRODUCTION_IDENTIFIER}.debug`;
const INTERNET_PERMISSION = 'android.permission.INTERNET';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isDevelopment = process.env.APP_VARIANT === DEVELOPMENT_VARIANT;

  return {
    ...config,
    slug: config.slug ?? 'jarling',
    name: isDevelopment ? 'Jarling Debug' : 'Jarling',
    scheme: isDevelopment ? 'jarling-debug' : 'jarling',
    android: {
      ...config.android,
      package: isDevelopment ? DEVELOPMENT_IDENTIFIER : PRODUCTION_IDENTIFIER,
      blockedPermissions: isDevelopment
        ? config.android?.blockedPermissions
        : [
            ...new Set([
              ...(config.android?.blockedPermissions ?? []),
              INTERNET_PERMISSION,
            ]),
          ],
    },
    ios: {
      ...config.ios,
      bundleIdentifier: isDevelopment
        ? DEVELOPMENT_IDENTIFIER
        : PRODUCTION_IDENTIFIER,
    },
  };
};
