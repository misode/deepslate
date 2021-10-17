import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'
import { terser } from 'rollup-plugin-terser'
import pkg from './package.json'

export default defineConfig([
	{
		input: 'src/index.ts',
		output: { file: pkg.unpkg, format: 'umd', sourcemap: true, name: 'deepslate' },
		plugins: [commonjs(), resolve(), typescript(), terser()],
	},
	{
		external: ['pako', 'gl-matrix', 'md5'],
		input: 'src/index.ts',
		output: [
			{ file: pkg.main, format: 'cjs', sourcemap: true },
			{ file: pkg.module, format: 'es', sourcemap: true },
		],
		plugins: [typescript(), terser()],
	},
	{
		input: 'src/index.ts',
		output: [{ file: pkg.types, format: 'es' }],
		plugins: [dts({ compilerOptions: { composite: false, incremental: false } })],
	},
])
