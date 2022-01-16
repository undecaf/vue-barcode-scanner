const common = {
    publicPath: './',

    configureWebpack: {
        output: {
            devtoolModuleFilenameTemplate,
            devtoolFallbackModuleFilenameTemplate: 'webpack-fallback:///[resource-path]?[hash]',
        },
        module: {
            rules: [
                {
                    use: ['source-map-loader'],
                    enforce: 'pre',
                    test: /\.js$/,
                    exclude: [
                        // Avoid warnings about sourcemaps that are missing in some packages
                    ],
                },
            ],
        },
        externals: /^https:\/\/cdn\.jsdelivr\.net\//,
    },

    chainWebpack(config) {
    },
}

const configs = {
    development: extend(common,
        {
            devtool: 'eval-source-map',
        },
        config => config.plugins.delete('prefetch')),

    test: common,

    production: extend(common,
        {
            optimization: {
                splitChunks: {
                    maxSize: 250000,
                }
            }
        }),
}


function extend(common, configureWebpack = {}, chainWebpack = () => {}) {
    return {
        ...common,
        configureWebpack: {
            ...common.configureWebpack,
            ...configureWebpack,
        },

        chainWebpack: config => {
            common.chainWebpack(config)
            chainWebpack(config)
        },
    }
}

// Preserve source file paths in browser devtools
function devtoolModuleFilenameTemplate(info) {
    if (info.resourcePath.match(/\.(vue|css)$/) && info.allLoaders) {
        return `webpack:///${info.resourcePath}?${info.hash}`

    } else {
        // Make sure no file ends up outside 'sources://'
        let here = info.resourcePath.startsWith('./') ? '' : './'
        return `sources://${here}${info.resourcePath}`
    }
}


module.exports = configs[process.env.NODE_ENV] || configs.production
