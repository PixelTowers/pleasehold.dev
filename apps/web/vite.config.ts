// ABOUTME: Vite configuration for the pleasehold web dashboard.
// ABOUTME: React plugin, TanStack Router plugin, and API/tRPC proxy to the backend.

import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [TanStackRouterVite(), react()],
	server: {
		port: 5173,
		proxy: {
			'/api': {
				target: 'http://localhost:3001',
				changeOrigin: true,
			},
			'/trpc': {
				target: 'http://localhost:3001',
				changeOrigin: true,
			},
		},
	},
});
