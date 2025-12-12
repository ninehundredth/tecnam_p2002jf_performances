import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tecnam.p2002jf.performance',
  appName: 'Tecnam P2002JF Performance',
  webDir: 'out',
  server: {
    android: {
      allowMixedContent: true,
    },
    ios: {
      allowMixedContent: true,
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#667eea',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#667eea',
    },
  },
};

export default config;

