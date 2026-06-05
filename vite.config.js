import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [
    uni(),
  ],
  build: {
    // 增大 chunk 警告阈值（拼音映射表有 6KB+）
    chunkSizeWarningLimit: 1000,
  },
  server: {
    proxy: {
      '/api-proxy': {
        target: 'https://move.wuyaoxuexi.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy/, ''),
      },
    },
  },
})
