import './css/normalize.css'
import './css/skeleton.css'
import './css/mask.css'
import './css/highlight.css'

import Vue from 'vue'
import Example from './Example.vue'
import '@fontsource/roboto'

Vue.config.productionTip = false

new Vue({
    el: "#app",
    render: h => h(Example),
})
