import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
				render: resolve(__dirname, 'render/index.html'),
				splines: resolve(__dirname, 'splines/index.html'),
				multinoise: resolve(__dirname, 'multinoise/index.html'),
			},
		},
	},
})
