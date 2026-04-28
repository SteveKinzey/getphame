import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.phame.app',
  appName: 'Phame',
  // The native app loads the live hosted site — no code bundled in the binary.
  // This means web updates are instantly live without an App Store re-submission.
  webDir: 'dist/public',
  server: {
    url: 'https://getphame.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#1a2744',
    scrollEnabled: false,
  },
  android: {
    backgroundColor: '#1a2744',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a2744',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a2744',
    },
    Contacts: {
      // iOS: permission usage description shown to user
    },
  },
};

export default config;
