import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'
import { terser } from 'rollup-plugin-terser'
import pkg from './package.json'

const dev = process.env.ROLLUP_WATCH === 'true'

export default defineConfig([
	...dev ? [] : [{
		input: 'src/index.ts',
		output: { file: pkg.unpkg, format: 'umd', sourcemap: true, name: 'deepslate' },
		plugins: [
			commonjs(),
			resolve(),
			esbuild(),
			terser(),
		],
	}],
	{
		external: ['pako', 'gl-matrix', 'md5'],
		input: 'src/index.ts',
		output: [
			{ file: pkg.main, format: 'cjs', sourcemap: true },
			{ file: pkg.module, format: 'es', sourcemap: true },
		],
		plugins: [
			esbuild(),
		],
	},
	{
		input: 'src/index.ts',
		output: [{ file: pkg.types, format: 'es' }],
		plugins: [dts({ compilerOptions: { composite: false, incremental: false } })],
	},
])
