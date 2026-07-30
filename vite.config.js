/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.fbx'],
  resolve: {
    dedupe: ['react', 'react-dom', 'three']
  },
  build: {
    rollupOptions: {
      // Capacitor native plugins — only exist on device, not in the browser.
      // The dynamic imports in useHealthData.js handle the fallback gracefully.
      external: ['capacitor-health-connect', '@perfood/capacitor-healthkit', '@capacitor/push-notifications']
    }
  },
  server: {
    host: true,
    // bind to 0.0.0.0 so phones on the same Wi-Fi can connect
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    strictPort: false
  },
  test: {
    projects: [{
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});