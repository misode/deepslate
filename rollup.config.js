import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'
import { terser } from 'rollup-plugin-terser'
import { typescriptPaths } from 'rollup-plugin-typescript-paths'
import { compilerOptions as tsconfig } from './tsconfig.json'

const dev = process.env.ROLLUP_WATCH === 'true'

const compilerOptions = {
	baseUrl: tsconfig.baseUrl,
	paths: tsconfig.paths,
}

export default defineConfig([
	...dev ? [] : [{
		input: 'main.ts',
		output: { file: './dist/deepslate.umd.js', format: 'umd', sourcemap: true, name: 'deepslate' },
		plugins: [
			commonjs(),
			resolve(),
			typescriptPaths({ preserveExtensions: true }),
			esbuild(),
			terser(),
		],
	}],
	{
		external: ['pako', 'gl-matrix', 'md5'],
		input: 'main.ts',
		output: [
			{ file: './dist/deepslate.cjs.js', format: 'cjs', sourcemap: true },
			{ file: './dist/deepslate.esm.js', format: 'es', sourcemap: true },
		],
		plugins: [
			typescriptPaths({ preserveExtensions: true }),
			esbuild(),
		],
	},
	{
		input: 'main.ts',
		output: [{ file: './dist/deepslate.d.ts', format: 'es' }],
		plugins: [dts({ compilerOptions })],
	},
	...['core', 'math', 'nbt', 'render', 'util', 'worldgen'].flatMap(part => [
		...dev ? [] : [{
			input: `${part}/src/main.ts`,
			output: { file: `./${part}/dist/${part}.umd.js`, format: 'umd', sourcemap: true, name: 'deepslate' },
			plugins: [
				commonjs(),
				resolve(),
				typescriptPaths({ preserveExtensions: true }),
				esbuild(),
				terser(),
			],
		}],
		{
			external: ['pako', 'gl-matrix', 'md5'],
			input: `${part}/src/main.ts`,
			output: [
				{ file: `./${part}/dist/${part}.cjs.js`, format: 'cjs', sourcemap: true },
				{ file: `./${part}/dist/${part}.esm.js`, format: 'es', sourcemap: true },
			],
			plugins: [
				typescriptPaths({ preserveExtensions: true }),
				esbuild(),
			],
		},
		{
			input: `${part}/src/main.ts`,
			output: [{ file: `./${part}/dist/${part}.d.ts`, format: 'es' }],
			plugins: [dts({ compilerOptions })],
		},
	]),
])
