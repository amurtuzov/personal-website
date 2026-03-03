import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { loadEnv } from 'vite'
import svgLoader from 'vite-svg-loader'
import { defineConfig } from 'vitest/config'

export default ({ mode }: { mode: string }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }
  return defineConfig({
    plugins: [
      vue(),
      svgLoader(),
    ],
    define: {
      APP_VERSION: JSON.stringify(process.env.npm_package_version),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "/src/styles/main" as *;`,
        },
      },
    },

    preview: {
      port: 3000,
    },
    server: {
      port: 8080,
      hmr: {
        host: 'localhost',
      },
    },
    test: {
      // silent: true,
      globals: true,
      environment: 'jsdom',
      setupFiles: '/tests/setup-vitest.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        exclude: ['node_modules/', '/tests/setup-vitest.ts'],
      },
    },
  })
}
