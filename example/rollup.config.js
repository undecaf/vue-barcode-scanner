import copy from 'rollup-plugin-copy'
import image from '@rollup/plugin-image'
import postcss from 'rollup-plugin-postcss'
import replace from '@rollup/plugin-replace'
import url from 'postcss-url'
import vue from 'rollup-plugin-vue'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'
import { ZBAR_WASM_REPOSITORY } from '@undecaf/barcode-detector-polyfill/zbar-wasm'

// Uncomment this to load module @undecaf/zbar-wasm from an alternate repository, e.g. from https://unpkg.com/
// import { ZBAR_WASM_PKG_NAME, ZBAR_WASM_VERSION } from '@undecaf/barcode-detector-polyfill/zbar-wasm'
// const ALTERNATE_ZBAR_WASM_REPOSITORY = `https://unpkg.com/${ZBAR_WASM_PKG_NAME}@${ZBAR_WASM_VERSION}`

const zbarWasmRepository =
    (typeof ALTERNATE_ZBAR_WASM_REPOSITORY !== 'undefined') ? ALTERNATE_ZBAR_WASM_REPOSITORY : ZBAR_WASM_REPOSITORY

const outputDir = '../docs/example'

export default [
    {
        input: 'src/main.js',
        output: {
            file: `${outputDir}/js/main.js`,
            format: 'esm',
            generatedCode: 'es2015',
            sourcemap: false,
        },

        external: [
            `${zbarWasmRepository}/dist/main.js`
        ],

        plugins: [
            vue(),

            postcss({
                to: `${outputDir}/.`,
                minimize: true,
                sourcemap: false,
                plugins: [
                    url({
                        url: 'inline',
                        maxSize: 5,     // kBytes
                        fallback: 'copy',
                        basePath: '.',
                        assetsPath: 'assets/',
                        useHash: true,
                    }),
                ],
            }),

            image(),

            nodeResolve(),

            copy({
                targets: [
                    { src: 'public/*', dest: outputDir },
                    { src: 'src/index-rollup.html', dest: outputDir, rename: 'index.html' },
                ],
            }),

            replace({
                values: {
                    // Replace the repository URL with the alternate repository URL if necessary
                    [ZBAR_WASM_REPOSITORY]: zbarWasmRepository,
                    'process.env.NODE_ENV': JSON.stringify('production'),
                },
                preventAssignment: true,
            }),

            terser(),
        ],
    },
]
