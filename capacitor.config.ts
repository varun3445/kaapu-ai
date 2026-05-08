import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kaapu.app',
  appName: 'Kaapu',
  webDir: 'dist',
  server: {
    // During development, point to your Vercel URL so you don't need to
    // rebuild every time. Remove this block for production APK builds.
    // url: 'https://kaapu-ai.vercel.app',
    // cleartext: true,
  },
  android: {
    backgroundColor: '#ffffff',
  },
  ios: {
    backgroundColor: '#eeeae6',
    allowsLinkPreview: false,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },
}

export default config
