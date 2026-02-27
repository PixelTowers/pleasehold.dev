// ABOUTME: Vite configuration for the pleasehold web dashboard.
// ABOUTME: React plugin, TanStack Router plugin, Tailwind CSS v4, and API/tRPC proxy to the backend.

import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [TanStackRouterVite(), tailwindcss(), react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
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
