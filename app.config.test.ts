import type { ConfigContext, ExpoConfig } from 'expo/config';

import createConfig from './app.config';

const baseConfig: ExpoConfig = {
  name: 'Jarling',
  slug: 'jarling',
};
const context = { config: baseConfig } as ConfigContext;
const originalVariant = process.env.APP_VARIANT;

afterEach(() => {
  if (originalVariant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = originalVariant;
});

describe('app config', () => {
  test('blocks Android Internet access in production', () => {
    delete process.env.APP_VARIANT;

    expect(createConfig(context).android?.blockedPermissions).toContain(
      'android.permission.INTERNET',
    );
  });

  test('keeps Internet access available to development tooling', () => {
    process.env.APP_VARIANT = 'development';

    expect(
      createConfig(context).android?.blockedPermissions ?? [],
    ).not.toContain('android.permission.INTERNET');
  });
});
