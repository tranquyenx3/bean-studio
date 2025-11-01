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
    // Vite sẽ tự động nạp các key bắt đầu bằng VITE_
    resolve: {
      alias: {
        // SỬA LỖI: Đổi '__dirname' thành 'process.cwd()'
        '@': path.resolve(process.cwd(), '.'),
      }
    }
  };
});
