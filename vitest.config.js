import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      expect: {
        toMatchScreenshot: {
          // Anything longer than teardownTimeout (10s) shows the bug; it is a
          // reasonable value for slow CI machines.
          timeout: Number(process.env.SCREENSHOT_TIMEOUT ?? 20_000),
        },
      },
    },
  },
})
