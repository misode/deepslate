import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'
import { terser } from 'rollup-plugin-terser'

export default defineConfig({
	input: 'src/index.ts',
	output: [
		// { dir: 'lib', format: 'cjs' },
		{ file: 'dist/index.min.js', format: 'iife', name: 'deepslate', plugins: [terser()] },
		{ file: 'dist/index.esm.js', format: 'esm' },
	],
	plugins: [
		resolve(),
		typescript({ outputToFilesystem: true }),
	],
})
