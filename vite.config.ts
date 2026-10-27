import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: {
    // The PDF engine is an on-demand export chunk, not part of the initial route payload.
    chunkSizeWarningLimit: 650,
  },
});
