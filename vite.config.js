import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import fs from 'vite-plugin-fs'
import { createProxyMiddleware } from 'http-proxy-middleware'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    fs({rootDir: import.meta.dirname}),
    {
      name: 'custom-proxy',
      configureServer(server) {
        server.middlewares.use(
          '/api',
          createProxyMiddleware({
            changeOrigin: true,
            secure: false,
            followRedirects: true,
            router: () => {
              return 'https://api.textyl.co'
            }
          })
        )
      }
    }
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 5173,
  }
})
