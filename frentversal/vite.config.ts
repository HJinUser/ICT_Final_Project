import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  // 로컬 개발(npm run dev) 시 proxy 설정
  // 프론트가 /api로 요청하면, vite 개발서버가 localhost:9000(백엔드)로 넘겨줌
  // 그리고 /api는 떼고 넘김 (rewrite) → 백엔드는 /product/list 로 받음
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // 이미지 경로도 백엔드로 넘김 (백엔드 WebConfig의 /images/** 처리용)
      '/images': {
        target: 'http://localhost:9000',
        changeOrigin: true,
      },
      // 업로드 파일도 백엔드로 넘김 (로컬 개발용)
      '/files': {
        target: 'http://localhost:9000',
        changeOrigin: true,
      },
    },
  },
})
