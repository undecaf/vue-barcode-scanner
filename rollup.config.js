import license from 'rollup-plugin-license'
import pkg from './package.json'
import vue from 'rollup-plugin-vue'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'

const input = 'src/BarcodeScanner.vue'

const plugins = [
    vue(),
    nodeResolve(),
    license({
        sourcemap: true,
        banner: {
            content: `${pkg.name} v${pkg.version}
                ${pkg.description}
                Built ${new Date().toISOString()}
                (c) 2021-present Ferdinand Kasper <fkasper@modus-operandi.at>
                Released under the MIT license`,
            commentStyle: 'ignored',
        },
        thirdParty: {
            allow: 'MIT',
        },
    }),
    terser(),
]

export default [
    {
        // Plain <script>
        input,
        output: {
            file: pkg.exports.script,
            format: 'iife',
            generatedCode: 'es2015',
            sourcemap: false,
            name: 'barcodeScanner',
            exports: 'named',
        },
        external: ['vue'],
        plugins,
    },

    {
        // ES module and <script type="module">
        input,
        output: {
            file: pkg.exports.default,
            format: 'esm',
            generatedCode: 'es2015',
            sourcemap: false,
        },
        external: ['vue'],
        plugins,
    },
]
