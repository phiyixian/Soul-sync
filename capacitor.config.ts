import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.soulsync.app',
  appName: 'SoulSync',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
