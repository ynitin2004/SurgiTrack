import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The dev server proxies REST and Socket.IO to the Express backend, so the
// browser talks to a single origin (no CORS issues in development).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // export libraries are imported on demand; pre-bundle them so the first
  // export click doesn't trigger a dev-server re-optimise + page reload
  optimizeDeps: { include: ['pptxgenjs', 'exceljs'] },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
});
