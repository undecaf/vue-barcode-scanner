const { ZBAR_WASM_REPOSITORY } = require('@undecaf/barcode-detector-polyfill/zbar-wasm')

// Uncomment this to load module @undecaf/zbar-wasm from an alternate repository, e.g. from https://unpkg.com/
// const { ZBAR_WASM_PKG_NAME, ZBAR_WASM_VERSION } = require('@undecaf/barcode-detector-polyfill/zbar-wasm')
// const ALTERNATE_ZBAR_WASM_REPOSITORY = `https://unpkg.com/${ZBAR_WASM_PKG_NAME}@${ZBAR_WASM_VERSION}`

process.env.VUE_APP_ZBAR_WASM_REPOSITORY =
    (typeof ALTERNATE_ZBAR_WASM_REPOSITORY !== 'undefined') ? ALTERNATE_ZBAR_WASM_REPOSITORY : ZBAR_WASM_REPOSITORY

const outputDir = '../docs/example'

const config = {
    outputDir,

    publicPath: './',

    configureWebpack: {
        externals: {
            [`${ZBAR_WASM_REPOSITORY}/dist/main.js`]: 'zbarWasm',
        },

        optimization: {
            splitChunks: {
                maxSize: 250000,
            },
        },
    },
}

module.exports = config
