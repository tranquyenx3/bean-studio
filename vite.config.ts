import path from 'path';
import { defineConfig } from 'vite'; // SỬA: Đã xóa 'loadEnv'
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // SỬA: Đã xóa dòng 'const env = loadEnv(...);'
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // SỬA: Đổi 'env.' thành 'process.env.'
      'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
