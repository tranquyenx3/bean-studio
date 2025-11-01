import path from 'path';
import { defineConfig } from 'vite'; // ĐÃ XÓA 'loadEnv'
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // ĐÃ XÓA dòng 'const env = loadEnv(...);'
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    // ĐÃ XÓA toàn bộ khối 'define'
    // Vite sẽ tự động nạp các key có VITE_
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
