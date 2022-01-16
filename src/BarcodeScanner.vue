<template>
  <div>
    <div class="viewport" ref="viewport">
      <!-- Scan area mask -->
      <div
        ref="mask"
        v-show="maskCss"
        :class="maskClasses"
        style="position: absolute; box-sizing: border-box; z-index: 1;"
      >
      </div>

      <!-- Barcode highlights -->
      <div
        v-for="(highlight, index) in highlights"
        :class="highlight.classes"
        :key="index"
        :style="highlight.style"
        style="position: absolute; box-sizing: border-box; z-index: 1;"
      >
      </div>

      <div ref="clientSrcContainer">
        <!-- Source element provided by the client -->
        <slot></slot>
      </div>

      <!-- Renderer for sources that are passed as 'source' prop -->
      <component ref="srcRendererElem" v-if="srcRendererTag" :is="srcRendererTag" />
    </div>
  </div>
</template>


<script>
// Event names
export const STARTED_EVENT = 'bcs-started'
export const STOPPED_EVENT = 'bcs-stopped'
export const SCANNED_EVENT = 'bcs-scanned'
export const ERROR_EVENT = 'bcs-error'


// Acceptable source elements
const
    SOURCE_ELEMENT_TAGS = ['img', 'canvas', 'video'],
    SOURCE_ELEMENT_SELECTOR = SOURCE_ELEMENT_TAGS.join(', ');


// Scan interval in ms if the specified rate is invalid
const DEFAULT_SCAN_INTERVAL = 50


// Scanning mode: truthy if repating, falsy if stopped or for a single scan
const
    MODE_STOPPED = null,
    MODE_SINGLE = false,
    MODE_START_REPEATING = true;
    // MODE_IS_REPEATING: the id returned by setTimeout()

const MODES = {
    [MODE_STOPPED]: 'MODE_STOPPED',
    [MODE_SINGLE]: 'MODE_SINGLE',
    [MODE_START_REPEATING]: 'MODE_START_REPEATING',
}


/**
 * Returns the parsed rate argument as an object with properties 'scanInterval'
 * (in ms) and 'loadFactor' (between 0 and 1). Exactly one of them is present
 * if the rate could be parsed, or else both are missing.
 */
function parseRate(rate) {
    const
        parts = /^\s*(\d+)(\S+)\s*$/.exec(rate),
        parsedRate = {};

    if (parts) {
        const
            value = Number(parts[1]),
            suffix = parts[2];

        if ((suffix === '/s') && (value > 0)) {
            // Scan interval in ms
            parsedRate.scanInterval = 1000 / value

        } else if ((suffix === '%') && (value > 0) && (value <= 100)) {
            // Load factor in
            parsedRate.loadFactor = value / 100
        }
    }

    return parsedRate
}


/**
 * Returns the intrinsic (as opposed to the rendered) with of a DOM element.
 */
function intrinsicWidth(htmlElement) {
    return htmlElement.videoWidth || htmlElement.naturalWidth || htmlElement.width
}


/**
 * Returns the intrinsic (as opposed to the rendered) height of a DOM element.
 */
function intrinsicHeight(htmlElement) {
    return htmlElement.videoHeight || htmlElement.naturalHeight || htmlElement.height
}


/**
 * Expects the argument to be an identifier in snake case and converts it to kebab case.
 */
function snakeToKebab(name) {
    return name.toLowerCase().replace(/_/g, '-')
}


/**
 *
 */
export default {
    name: 'BarcodeScanner',


    props: {
        source: {
            type: Object,
            required: false,
        },

        formats: {
            type: Array,
            default: null,
        },

        scanning: {
            type: Boolean,
            default: false,
        },

        rate: {
            type: String,
            default: `${Math.round(1000 / DEFAULT_SCAN_INTERVAL)}/s`,
            validator: value => Object.keys(parseRate(value)).length,
        },

        maskCss: {
            type: String,
            default: null,
        },

        highlightCss: {
            type: String,
            default: undefined,
        },

        debug: {
            type: Boolean,
            default: false,
        },
    },


    data() {
        return {
            // DOM element that is examined for barcodes, or null; may be an element
            // provided by the client, or a source renderer created by this component
            srcElem: null,

            // Type (tag name) of source renderer, or null if srcElem is provided by the client
            srcRendererTag: null,

            // Observes changes of the source element
            srcObserver: null,

            // Scanning mode, see the constants defined above
            mode: MODE_STOPPED,

            // Detected barcodes as returned from BarcodeDetector.detect()
            barcodes: [],
        }
    },


    computed: {
        /**
         * Returns a BarcodeDetector configured for the current 'formats' prop.
         */
        detector() {
            return new BarcodeDetector({ formats: this.formats || undefined })
        },


        /**
         * Returns the parsed 'rate' prop as an object with properties 'scanInterval'
         * (in ms) and 'loadFactor' (between 0 and 1). Exactly one of them is present
         * if the rate could be parsed, or else both are missing.
         */
        parsedRate() {
            return parseRate(this.rate)
        },


        maskClasses() {
            if (this.maskCss) {
                const classes = this.barcodes.map(barcode => barcode.format)
                classes.push(...classes.map(snakeToKebab))
                if (classes.length) {
                    classes.push('detected')
                }
                classes.push(this.maskCss)

                return classes

            } else {
                return []
            }
        },


        /**
         * Returns an array of objects that describe positions, dimensions and CSS styles
         * of the barcode highlights relative to the viewport.
         * The array contains one object for each detected barcode.
         * An empty array is returned iff the highlightCss prop is null or if there is
         * no source element.
         */
        highlights() {
            const
                highlightCss = (typeof this.highlightCss !== 'undefined')
                    ? this.highlightCss
                    // Class name of default highlighting style
                    : 'f0212f9f-41b5-40d0-8e40-87c97a8a9f28',
                srcElem = this.srcElem;

            if (highlightCss && srcElem) {
                return this.barcodes.map(barcode => {
                    const
                        xScale = 100 / intrinsicWidth(srcElem),
                        yScale = 100 / intrinsicHeight(srcElem),
                        box = barcode.boundingBox;

                    return {
                        style: {
                            left: `${box.x * xScale}%`,
                            top: `${box.y * yScale}%`,
                            width: `${box.width * xScale}%`,
                            height: `${box.height * yScale}%`,
                        },
                        classes: [ highlightCss, barcode.format, snakeToKebab(barcode.format) ],
                    }
                })

            } else {
                // this.highlightCss === null, no highlighting
                return []
            }
        },

        srcElemTag() {
            return this.srcElem && this.srcElem.tagName.toLowerCase()
        },

        log() {
            return this.debug
                ? (msg) => {
                    if (typeof msg === 'function') {
                        // Factory function
                        msg = msg()
                    }
                    console.log(`${this.$options.name}: ${msg}`)
                }
                : () => {}
        },
    },


    watch: {
        source() {
            this.log('source prop changed')
            this.attach()
        },

        formats() {
            this.log('formats changed')
            if (this.mode === MODE_STOPPED) {
                this.start()
            }
        },

        maskCss() {
            this.log('maskCss changed')
            if (this.mode === MODE_STOPPED) {
                // The browser needs to render the new mask
                // before coordinates and dimensions are available
                this.$nextTick(() => this.start())
            }
        },

        scanning(newValue) {
            if (newValue && (this.mode === MODE_STOPPED)) {
                this.log('scanning changed: start')
                this.start((this.srcElemTag === 'video') ? MODE_START_REPEATING : MODE_SINGLE)

            } else if (!newValue && this.mode) {
                // Stop repeated scanning
                this.log('scanning changed: stop')
                this.stop()
            }
        },
    },


    mounted() {
        this.log('mounted()')

        // Re-attach whenever the source element or a src/srcObject attribute is changed
        this.srcObserver = new MutationObserver(() => this.attach())
        this.srcObserver.observe(
            this.$refs.clientSrcContainer,
            { subtree: true, childList: true, attributeFilter: ['src', 'srcObject'] }
        )

        this.attach()
    },


    beforeDestroy() {
        this.log('beforeDestroy()')

        this.detach()
        this.srcObserver.disconnect()
    },


    methods: {
        /**
         * Returns a Promise for having detected and stored
         * the barcodes found on the source element.
         */
        detect() {
            const srcElem = this.srcElem

            if (!srcElem) {
                // Ignore spurious invocations by watchers
                this.log('detect(): ignored')

                return Promise.resolve()
            }

            const
                maskRect = this.maskRect(),
                imagePromise = this.maskCss
                  ? createImageBitmap(srcElem, maskRect.x, maskRect.y, maskRect.width, maskRect.height)
                  : Promise.resolve(srcElem);

            return imagePromise
                .then(image => this.detector.detect(image))
                .then(barcodes => {
                    barcodes.forEach(barcode => {
                        // Transform corner points and bounding box to viewport coordinates
                        barcode.cornerPoints.forEach(p => {
                            p.x += maskRect.x
                            p.y += maskRect.y
                        })

                        const
                            box = barcode.boundingBox,
                            rect = DOMRectReadOnly.fromRect({
                                x: box.x + maskRect.x,
                                y: box.y + maskRect.y,
                                width: box.width,
                                height: box.height,
                            });

                        barcode.boundingBox = rect
                    });

                    this.log(() => `detected ${barcodes.length} barcode(s)`)

                    this.barcodes = barcodes
                    this.emit(SCANNED_EVENT, barcodes)
                })

                .catch(error => {
                    this.handleError(error)
                })
        },


        start(mode) {
            this.log(() => `start(${MODES[mode] || ''})`)

            const srcElem = this.srcElem

            if (!srcElem || srcElem.ended || srcElem.paused || srcElem.error || (mode === MODE_STOPPED)) {
                if (srcElem && srcElem.error) {
                    this.handleError(srcElem.error.message, srcElem.error)
                }

                this.stop()
                return
            }

            if (typeof mode !== 'undefined') {
                if (this.mode === MODE_STOPPED) {
                    // First invocation after being stopped
                    this.emit(STARTED_EVENT)
                }

                this.mode = mode
            }

            this.setScanning(true)

            if (this.mode) {
                const startedAt = performance.now()

                this.detect()
                    .then(barcodes => {
                        // Continue only if scanning has not been stopped while detection was in progress
                        if (this.mode) {
                            const
                                duration = performance.now() - startedAt,
                                delay = (
                                    this.parsedRate.scanInterval ||
                                    duration / this.parsedRate.loadFactor ||
                                    DEFAULT_SCAN_INTERVAL
                                ) - duration

                            this.mode = setTimeout(() => this.start(), Math.max(delay, 1))
                        }
                    })
                    .catch(error => {
                        this.handleError(error)
                        this.stop()
                    })

            } else {
                this.detect()
                    .finally(() => {
                        this.stop()
                    })
            }
        },


        stop() {
            this.log('stop()')

            if (this.mode !== MODE_STOPPED) {
                clearTimeout(this.mode)
                this.mode = MODE_STOPPED

                this.setScanning(false)
                this.emit(STOPPED_EVENT)
            }
        },


        /**
         * Attaches the source element/property to this component
         * and starts scanning.
         */
        attach() {
            /**
             * Returns a Promise for a new source renderer element
             * with the specified tag.
             */
            const createSrcRenderer = (tag) => {
                // Destroy the previous renderer to get rid of event listeners
                this.srcRendererTag = null

                return new Promise(resolve => {
                    // The <component> needs a tick to react to the new 'is' value
                    this.$nextTick(() => {
                        // Previous renderer was destroyed, now create the requested one
                        this.srcRendererTag = tag
                        this.$nextTick(() => resolve(this.$refs.srcRendererElem))
                    })
                })
            }

            /**
             * Installs a new <img> element as source renderer and
             * renders the specified Blob.
             */
            const installImgRenderer = (blob) => {
                createSrcRenderer('img')
                    .then(srcElem => {
                        srcElem.crossorigin = 'anonymous'
                        srcElem.srcObject = null
                        srcElem.src = URL.createObjectURL(blob)
                        srcElem
                            .decode()
                            .then(() => {
                                this.log(() => `attaching image renderer for ${blob.constructor.name}`)

                                URL.revokeObjectURL(blob)
                                this.srcElem = srcElem
                                this.start(MODE_SINGLE)
                            })
                            .catch(error => this.handleError(error))
                    })
            }

            /**
             * Installs a new <video> element as source renderer
             * and starts playing the specified Blob or MediaStream.
             */
            const installVideoRenderer = ({ blob = null, mediaStream = null }) => {
                createSrcRenderer('video')
                    .then(srcElem => {
                        srcElem.addEventListener('play', () => {
                            this.log('attached video plays')

                            this.srcElem = srcElem
                            this.start(MODE_START_REPEATING)
                        })

                        srcElem.addEventListener('ended', () => {
                            this.log('attached video ended')

                            blob && URL.revokeObjectURL(blob)
                        })

                        srcElem.addEventListener('error', () => {
                            blob && URL.revokeObjectURL(blob)
                            this.handleError(`error loading video`)
                        })

                        this.log(() => `attaching video renderer for ${(blob || mediaStream).constructor.name}`)

                        srcElem.crossorigin = 'anonymous'
                        srcElem.muted = true
                        srcElem.playsinline = true
                        srcElem.autoplay = true
                        srcElem.srcObject = mediaStream
                        srcElem.src = blob ? URL.createObjectURL(blob) : ''
                    })
            }

            /**
             * Installs a new <canvas> element as source renderer and draws
             * the specified image onto it.
             */
            const installCanvasRenderer = ({ source, image = source, drawMethod }) => {
                createSrcRenderer('canvas')
                    .then(srcElem => {
                        this.log(() => `attaching canvas renderer for ${source.constructor.name}`)

                        srcElem.width = source.width
                        srcElem.height = source.height
                        srcElem.getContext('2d')[drawMethod](image, 0, 0)

                        this.srcElem = srcElem
                        this.start(MODE_SINGLE)
                    })
            }


            this.detach()

            this.log('attach()')

            const
                source = this.source,
                // Ignore text and comment nodes
                srcVNodes = (this.$slots.default || []).filter(vnode => vnode.tag);

            if (srcVNodes.length) {
                // The source element/container is provided by the client
                this.srcRendererTag = null

                if (srcVNodes.length === 1) {
                    const
                        srcVNode = srcVNodes[0],
                        srcVNodeTag = srcVNode.tag.toLowerCase(),
                        selector = source || SOURCE_ELEMENT_SELECTOR,
                        selected = this.$refs.clientSrcContainer.querySelector(selector);

                    if (SOURCE_ELEMENT_TAGS.includes(srcVNodeTag)) {
                        // Plain source element
                        this.log(() => `attaching client <${srcVNode.elm.tagName}>`)

                        this.srcElem = srcVNode.elm

                    } else if (selected) {
                        // Source element in a container
                        this.log(() => `attaching client <${selected.tagName}>`)

                        this.srcElem = selected

                    } else {
                        this.handleError(`source element not found, one of ${selector} was expected.`)
                        return
                    }

                    if (this.srcElemTag === 'video') {
                        // Start repeated scanning immediately
                        this.start(MODE_START_REPEATING)

                    } else if (this.srcElemTag === 'img') {
                        // Wait until the image has been decoded then start a single scan
                        this.srcElem.decode()
                            .then(() => this.start(MODE_SINGLE))
                            .catch(error => this.handleError(error))

                    } else {
                        // Start a single scan on a canvas
                        this.start(MODE_SINGLE)
                    }

                } else {
                    this.handleError(`${srcVNodes.length} children found but only one was expected.`)
                }

            } else if (source) {
                // A source renderer is required

                // Taking into account that not all of these classes may exist in every browser
                if ((typeof Blob === 'function') && (source instanceof Blob)) {
                    if (source.type.startsWith('image/')) {
                        // Render the blob in an img element
                        installImgRenderer(source)

                    } else if (source.type.startsWith('video/')) {
                        // Play the blob in a video element
                        installVideoRenderer({ blob: source })

                    } else {
                        this.handleError(`source has type ${$source.type} but image/* or video/* was expected.`)
                    }

                } else if ((typeof MediaStream === 'function') && (source instanceof MediaStream)) {
                    // Play the media stream in a video element
                    installVideoRenderer({ mediaStream: source})

                } else if ((typeof ImageData === 'function') && (source instanceof ImageData)) {
                    // Draw the image on a canvas element
                    installCanvasRenderer({ source, drawMethod: 'putImageData' })

                } else if ((typeof ImageBitmap === 'function') && (source instanceof ImageBitmap)) {
                    // Draw the bitmap on a canvas element
                    installCanvasRenderer({ source, drawMethod: 'drawImage' })

                } else if ((typeof OffscreenCanvas === 'function') && (source instanceof OffscreenCanvas)) {
                    // Draw the offscreen canvas on a canvas element
                    installCanvasRenderer({ source, image: source.transferToImageBitmap(), drawMethod: 'drawImage' })

                } else {
                    this.handleError(
                        `source is ${source} but one of ` +
                        'Blob, MediaStream, ImageData, ImageBitmap or OffscreenCanvas was expected.'
                    )
                }

            } else {
                // No source, already detached
                this.log('attaching no source')
            }
        },


        /**
         * Stops barcode detection, removes barcode highlights, stops media streams
         * and detaches the source element/property from this component.
         */
        detach() {
            this.log('detach()')

            if (this.srcElem && this.srcElem.srcObject) {
                // Stop media stream tracks
                this.log(() => `detach: stopping ${this.srcElem.srcObject.getTracks().length} track(s)`)

                this.srcElem.srcObject.getTracks().forEach(track => track.stop())
            }

            this.stop()
            this.barcodes = []
            this.srcRendererTag = null
            this.srcElem = null
        },


        /**
         * Returns the intrinsic (as opposed to the offset) coordinates and dimensions
         * of the source element
         */
        maskRect() {
            const srcElem = this.srcElem

            if (this.maskCss) {
                // The source rectangle covers the border box of the mask
                const
                    { offsetLeft, offsetTop, offsetWidth, offsetHeight } = this.$refs.mask,
                    { clientWidth, clientHeight } = this.$refs.viewport,
                    sourceXScale = intrinsicWidth(srcElem) / clientWidth,
                    sourceYScale = intrinsicHeight(srcElem) / clientHeight;

                return {
                    x: Math.round(offsetLeft * sourceXScale),
                    y: Math.round(offsetTop * sourceYScale),
                    width: Math.round(offsetWidth * sourceXScale),
                    height: Math.round(offsetHeight * sourceYScale),
                }

            } else {
                // The source rectangle covers the source element completely
                return { x: 0, y: 0, width: intrinsicWidth(srcElem), height: intrinsicHeight(srcElem) }
            }
        },


        /**
         * Updates prop 'scanning' with a new value if necessary.
         */
        setScanning(scanning) {
           if (Boolean(this.scanning) !== Boolean(scanning)) {
               this.emit('update:scanning', scanning, true)
           }
        },


        /**
         * Emits an event and eventually logs it.
         */
        emit(name, payload, logPayload = false) {
            this.log(() => logPayload ? `emit('${name}', ${payload}) ` : `emit('${name}')`)
            this.$emit(name, payload)
        },


        /**
         * Emits an ERROR_EVENT with the specified error
         * and logs the message at the console.
         */
        handleError(msg, error = msg) {
            console.error(`${this.$options.name}: ${msg}`)
            this.emit(ERROR_EVENT, error, true)
        },
    },
}
</script>


<style scoped>
.viewport {
    display: inline-block;
    position: relative;
    overflow: hidden;
}

/* Source element, source renderer */
.viewport img,
.viewport canvas,
.viewport video,
.viewport > :last-child {
    display: block;
    height: auto;
    max-width: 100%;
}

/* Default style of barcode highlights */
.viewport .f0212f9f-41b5-40d0-8e40-87c97a8a9f28 {
    border: #80ff80 solid 2px;
    background-color: rgba(128, 255, 128, 0.3);
}
</style>