import esbuild from 'esbuild'
import inlineImage from 'esbuild-plugin-inline-image'
import vue from 'esbuild-vue'
import { copy } from 'esbuild-plugin-copy'
import { replace } from 'esbuild-plugin-replace'
import { ZBAR_WASM_REPOSITORY } from '@undecaf/barcode-detector-polyfill/zbar-wasm'

// Uncomment this to load module @undecaf/zbar-wasm from an alternate repository, e.g. from https://unpkg.com/
// import { ZBAR_WASM_PKG_NAME, ZBAR_WASM_VERSION } from '@undecaf/barcode-detector-polyfill/zbar-wasm'
// const ALTERNATE_ZBAR_WASM_REPOSITORY = `https://unpkg.com/${ZBAR_WASM_PKG_NAME}@${ZBAR_WASM_VERSION}`

const zbarWasmRepository =
    (typeof ALTERNATE_ZBAR_WASM_REPOSITORY !== 'undefined') ? ALTERNATE_ZBAR_WASM_REPOSITORY : ZBAR_WASM_REPOSITORY

const outputDir = '../docs/example'

const options = {
    define: {
        __VUE_OPTIONS_API__: JSON.stringify(true),
        __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
        'process.env.NODE_ENV': JSON.stringify('production'),
    },

    entryPoints: ['src/main.js'],
    outbase: 'src',
    outdir: `${outputDir}`,
    entryNames: '[name]',
    assetNames: 'assets/[name]',
    format: 'esm',
    target: 'es2015',
    bundle: true,
    minify: true,
    sourcemap: false,

    // file/copy/dataurl loaders produce corrupted files/data URLs,
    // see this issue: https://github.com/evanw/esbuild/issues/2424
    // Plugin esbuild-plugin-inline-image works correctly, used below
    loader: {
        // '.png': 'file',
        // '.gif': 'file',
        // '.woff': 'file',
        // '.woff2': 'file',
    },

    plugins: [
        vue(),

        // Workaround for file/copy/dataurl loaders, see above
        inlineImage({
            extensions: ['png', 'gif', 'woff', 'woff2'],
        }),

        copy({
            assets: [
                { from: 'public/img/*', to: 'img/' },
                { from: 'src/index-esbuild.html', to: 'index.html' },
            ],
        }),

        replace({
            values: {
                // Replaces the repository URL with the alternate repository URL if necessary
                [ZBAR_WASM_REPOSITORY]: zbarWasmRepository,
            },
        }),
    ],
}

console.log(await esbuild.build(options))
