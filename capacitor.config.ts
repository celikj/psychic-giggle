import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tasklock.app',
  appName: 'TaskLock',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
  backgroundColor: '#0a0a0f',
};

export default config;
