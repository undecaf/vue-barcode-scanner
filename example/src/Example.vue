<template>
  <div class="container" id="container">
    <div>
      <h4 class="row">Vue barcode scanner component</h4>
    </div>

    <h5 class="row error" v-if="error">{{ error }}</h5>

    <div class="row">
      <barcode-scanner
        class="barcode-scanner"
        :formats="formats"
        :source="source"
        :scanning.sync="scanning"
        :rate="rateValue + rateSuffix"
        :mask-css="maskCss"
        :highlight-css="highlightCss"
        :debug="debug"
        @bcs-started="isScanning = true"
        @bcs-stopped="isScanning = false"
        @bcs-scanned="scanned"
        @bcs-error="showError"
      >
        <img
          v-if="isImgSourceActive"
          ref="imgSource"
          crossorigin="anonymous"
        >

        <video
          v-if="isVideoSourceActive"
          ref="videoSource"
          crossorigin="anonymous"
          muted
          autoplay
          playsinline
          controls
          controlslist="nodownload nofullscreen"
        >
        </video>
      </barcode-scanner>
    </div>

    <h4 class="row">Detected barcodes</h4>

    <div class="row">
      <table class="u-full-width">
        <thead>
          <tr>
            <th>code</th>
            <th>format and orientation</th>
            <th>quality</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in barcodes" :key="b.rawValue">
            <td><pre>{{ b.rawValue }}</pre></td>
            <td>
              <code>{{ b.format }}</code>
              <img class="info" :src="arrows[b.orientation]" :title="orientations[b.orientation]">
            </td>
            <td>{{ Math.round(b.quality).toLocaleString() }}</td>
          </tr>
          <tr>
            <td colspan="3" v-if="!barcodes.length">Nothing detected</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h4 class="row">Configuration</h4>

    <div class="row">
      <div class="six columns">
        <label for="source">
          Source
          <img
            class="info"
            :src="infoIcon"
            title="Configures the source element and the 'source' attribute"
          >
        </label>
        <div id="source-container">
          <select
            v-model="sourceOption"
            class="u-full-width"
            id="source"
          >
            <option :value="null">No source</option>

            <optgroup
              label="Cameras (MediaStream sources)"
              title="Uses a camera MediaStream as source"
            >
              <option :value="backCamera">Back camera</option>
              <option :value="frontCamera">Front camera</option>
            </optgroup>

            <optgroup
              label="Media"
              title="Uses local and remote resources as source"
            >
              <option
                :value="selectFile"
                title="Loads a local image/video into a File source"
              >
                Image/video file... (File source)
              </option>
              <!-- The most recently uploaded file -->
              <option v-if="file" :value="file">&nbsp;&nbsp;&nbsp;&nbsp;{{ file.name }} ({{ file.type }})</option>

              <option
                :value="enterUrl"
                title="Loads a remote resource into an &lt;img&gt;/&lt;video&gt; element and uses it as source"
              >
                Image/video URL... (&lt;img&gt;/&lt;video&gt; source)
              </option>
              <!-- The most recent URL -->
              <option v-if="mediaResponse" :value="mediaResponse">&nbsp;&nbsp;&nbsp;&nbsp;{{ mediaResponse.url }}</option>
            </optgroup>

            <optgroup
              label="Sample images (File sources)"
              title="Loads a remote image resource into a File source"
            >
              <option value="codabar">Codabar</option>
              <option value="code_39">Code-39</option>
              <option value="code_39x4">Code-39, all orientations</option>
              <option value="code_39x3">Code-39, various sizes</option>
              <option value="code_93">Code-93</option>
              <option value="code_128">Code-128</option>
              <option value="databar">Databar</option>
              <option value="databar_exp">Databar Expanded</option>
              <option value="ean_8">EAN-8</option>
              <option value="ean_13">EAN-13</option>
              <option value="ean_13+2">EAN-13+2</option>
              <option value="ean_13+5">EAN-13+5</option>
              <option value="isbn_10">ISBN-10</option>
              <option value="isbn_13">ISBN-13</option>
              <option value="itf">Interleaved 2-of-5 (ITF)</option>
              <option value="qr_code">QR code</option>
              <option value="upc_a">UPC-A</option>
              <option value="upc_e">UPC-E</option>
            </optgroup>
          </select>

          <!-- Not displayed -->
          <input
            type="file"
            ref="fileInput"
            accept="image/*,video/*"
            @change="openFile"
          >

          <!-- Only displayed while entering an URL -->
          <input
            type="url"
            ref="mediaUrl"
            class="u-full-width"
            v-show="enteringUrl"
            v-model="mediaUrl"
            required
            placeholder="Enter a media URL then click outside"
            @focus="$event.target.select()"
            @change="openUrl"
            @blur="openUrl"
          >
        </div>

        <label>
          <input
            type="checkbox"
            v-model="isBarcodeDetectorPolyfilled"
            :disabled="!nativeBarcodeDetector"
            @change="selectBarcodeDetector"
          >
          <span class="label-body">
            <a href="https://www.npmjs.com/package/@undecaf/barcode-detector-polyfill" target="_blank">
              <code>BarcodeDetectorPolyfill</code>
            </a>
            <img
              class="info"
              :src="infoIcon"
              title="Uses this polyfill even if a native BarcodeDetector is available; if disabled then no native BarcodeDetector was found"
            >
          </span>
        </label>

        <label>
          <input type="checkbox" v-model="debug">
          <span class="label-body">Log events and debug messages</span>
          <img
            class="info"
            :src="infoIcon"
            title="Controls the 'debug' attribute; messages are easier to follow with reduced scanning frequency"
          >
        </label>

        <label>
          <span>Scanning</span>
          <input type="radio" v-model="scanning" :value="true"><span>on</span>
          <input type="radio" v-model="scanning" :value="false"><span>off</span>
          <img
            class="info"
            :src="infoIcon"
            title="Indicates the value of the 'scanning' attribute and can override it"
          >

          <input type="checkbox" v-model="singleScans">
          <span class="label-body">Single scans</span>
        </label>

        <label for="rate">
          <input type="radio" v-model="rateSuffix" value="/s" :disabled="singleScans">
          <span title="Target scanning frequency for 'rate' attribute">
            Scans/s
          </span>
          <input type="radio" v-model="rateSuffix" value="%" :disabled="singleScans">
          <span title="% of processing time to use for barcode detection, sets the 'rate' attribute">processing load %</span>
          <span v-show="isScanning" title="Actual scanning frequency, may be limited by processing speed">
            (actual: {{ scansPerSecFormat.format(scansPerSec) }}/s)
          </span>
        </label>
        <input
          class="u-full-width"
          id="rate"
          type="number"
          min="1"
          max="100"
          step="9"
          placeholder="1 ... 100"
          v-model.number="rateValue"
          :disabled="singleScans"
        >

        <label for="mask-css">
          Scan area mask examples
          <img
            class="info"
            :src="infoIcon"
            title="Examples of CSS classes for the 'mask-css' attribute"
          >
        </label>
        <select
          v-model="maskCss"
          class="u-full-width"
          id="mask-css"
        >
          <option :value="null">Default (viewport)</option>
          <option value="plain-center">Plain centered</option>
          <option value="marching-ants">Marching ants</option>
          <option value="feedback">Text feedback</option>
          <option value="corners">Corners giving feedback</option>
          <option value="eccentric">Eccentric</option>
        </select>

        <label for="highlight-css">
          Barcode highlighting examples
          <img
            class="info"
            :src="infoIcon"
            title="Examples of CSS classes for the 'highlight-css' attribute"
          >
        </label>
        <select
          v-model="highlightCss"
          class="u-full-width"
          id="highlight-css"
        >
          <option :value="undefined">Default</option>
          <option :value="null">None</option>
          <option value="simple">Alternate color</option>
          <option value="format-label">Format as text</option>
          <option value="color-coded">Color indicates format</option>
          <option value="pointers">Corners, surrounding area dimmed</option>
        </select>
      </div>

      <div class="six columns">
        <label for="formats">
          Barcode format(s) to detect
          <img
            class="info"
            :src="infoIcon"
            title="Supported barcode formats; the selected ones become the 'formats' attribute"
          >
        </label>
        <select
          class="u-full-width"
          id="formats"
          ref="formats"
          multiple
          :size="supportedFormats.length"
          @change="updateFormats"
        >
          <option v-for="f in supportedFormats" :key="f" :value="f" :selected="formats.includes(f)">
            {{ f }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script>
// Data URIs created by @rollup/plugin-image
import INFO_ICON from './assets/info.png'
import ARROW_DOWN from './assets/arrow-down.png'
import ARROW_LEFT from './assets/arrow-left.png'
import ARROW_RIGHT from './assets/arrow-right.png'
import ARROW_UP from './assets/arrow-up.png'

import BarcodeScanner from '@undecaf/vue-barcode-scanner'
import { BarcodeDetectorPolyfill } from '@undecaf/barcode-detector-polyfill'

const ACTIVE_SOURCE = {
    PROP: 0,     // source property
    IMG: 1,      // embedded <img> element
    VIDEO: 2,    // embedded <video> element
}

const
    ARROWS = [ARROW_UP, ARROW_RIGHT, ARROW_DOWN, ARROW_LEFT],
    ORIENTATIONS = ['upright', 'rotated 90° right', 'upside down', 'rotated 90° left']

const DEFAULT_FORMATS = [ 'code_128', 'code_39', 'ean_13', 'itf', 'qr_code', 'upc_a' ]


/**
 * Returns the native BarcodeDetector if available, or undefined.
 */
function getNativeBarcodeDetector() {
    try {
        window['BarcodeDetector'].getSupportedFormats()
        return window['BarcodeDetector']
    } catch {}
}


export default {
    name: 'Example',

    components: {
        BarcodeScanner,
    },

    data() {
        return {
            nativeBarcodeDetector: getNativeBarcodeDetector(),
            isBarcodeDetectorPolyfilled: !getNativeBarcodeDetector(),

            sourceOption: null,
            source: null,
            activeSource: ACTIVE_SOURCE.PROP,
            file: null,
            mediaUrl: null,
            mediaResponse: null,
            enteringUrl: false,
            scanning: false,
            singleScans: false,
            supportedFormats: [],
            formats: [],
            rateValue: 20,
            rateSuffix: '/s',
            maskCss: null,
            highlightCss: undefined,
            debug: false,

            barcodes: [],
            isScanning: false,
            scanInstants: [],
            error: null,
        }
    },

    computed: {
        isImgSourceActive() {
            return this.activeSource === ACTIVE_SOURCE.IMG
        },

        isVideoSourceActive() {
            return this.activeSource === ACTIVE_SOURCE.VIDEO
        },

        frontCamera() {
            return { facingMode: 'user' }
        },

        backCamera() {
            return { facingMode: 'environment' }
        },

        infoIcon() {
            return INFO_ICON
        },

        arrows() {
            return ARROWS
        },

        orientations() {
            return ORIENTATIONS
        },

        scansPerSec() {
            // Derive the scanning frequency from the moving average of scanning intervals
            const
                instants = this.scanInstants,
                intervalCount = instants.length-1;

            return (intervalCount) ? intervalCount * 1000 / Math.abs(instants[0] - instants[intervalCount]) : 0
        },

        scansPerSecFormat() {
            return new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        },
    },

    watch: {
        sourceOption(option, prevOption) {
            // Clear the barcode list and the error whenever the source is changed
            this.barcodes = []
            this.error = null

            if (typeof option === 'string') {
                // Convert the name fragment of a sample image URL to a Blob source
                fetch(`img/${option}.png`)
                    .then(response => response.blob())
                    .then(blob => {
                        this.source = blob
                        this.activeSource = ACTIVE_SOURCE.PROP
                    })
                    .catch(error => this.errorHandler(error))

            } else if ((option === this.frontCamera) || (option === this.backCamera)) {
                // Convert video options to a MediaStream from a camera
                navigator.mediaDevices.getUserMedia({ audio: false, video: option })
                    .then(stream => {
                        this.source = stream
                        this.activeSource = ACTIVE_SOURCE.PROP
                    })
                    .catch(error => this.errorHandler(error))

            } else if ((option instanceof Blob) || (option === null)) {
                // A local file, converted to a File object by openFile()
                this.source = option
                this.activeSource = ACTIVE_SOURCE.PROP

            } else if (option instanceof Response) {
                // The response obtained by openUrl() to the HEAD request of a remote image/video resource
                if ((prevOption instanceof Response) && (option.url === prevOption.url)) {
                    // Workaround for getting two equal but non-identical Response instances in success
                    return
                }

                const contentType = option.headers.get('Content-Type')

                if (contentType && contentType.startsWith('image/')) {
                    // Use the URL as image src
                    this.source = null
                    this.activeSource = ACTIVE_SOURCE.IMG
                    this.$nextTick(() => this.$refs.imgSource.src = option.url)

                } else if (contentType && contentType.startsWith('video/')) {
                    // Use the URL as video src
                    this.source = null
                    this.activeSource = ACTIVE_SOURCE.VIDEO
                    this.$nextTick(() => this.$refs.videoSource.src = option.url)

                } else {
                    this.error = `Unsupported content type: ${contentType}`
                    this.source = null
                }

            } else if (typeof option === 'function') {
                // A function that sets sourceOption to one of the cases handled above
                this.source = null
                this.activeSource = ACTIVE_SOURCE.PROP
                option()

            }
        },
    },

    created() {
        this.sourceOption = this.backCamera
        this.selectBarcodeDetector()
    },

    methods: {
        scanned(barcodes) {
            // Save the detected barcodes if there are any
            if (barcodes.length) {
                this.barcodes = barcodes
            }

            // Keep the most recent scanning instants in an array
            // to calculate the moving average of the actual scanning frequency
            const maxScanInstants = (this.scansPerSec >= 2) ? Math.round(this.scansPerSec) : 2

            this.scanInstants.unshift(performance.now())
            this.scanInstants.length = Math.min(this.scanInstants.length, maxScanInstants)

            if (this.singleScans) {
                this.scanning = false
            }

            this.error = null
          },

        updateFormats() {
            // If using v-model on #formats then clicking on a format option
            // will be disturbed by scanning updates that happen *during* the
            // click, so this workaround is needed
            const selectedOptions = this.$refs.formats.selectedOptions
            this.formats = []

            for (let i = 0; i < selectedOptions.length; i++) {
                this.formats.push(selectedOptions[i].value)
            }
        },

        showError(error) {
            this.error = error
        },

        async selectBarcodeDetector() {
            window.BarcodeDetector = this.isBarcodeDetectorPolyfilled
                ? BarcodeDetectorPolyfill
                : this.nativeBarcodeDetector

            this.supportedFormats = [...await window.BarcodeDetector.getSupportedFormats()].sort()
            this.formats = DEFAULT_FORMATS.filter(f => this.supportedFormats.includes(f))
        },

        selectFile() {
            this.$refs.fileInput.dispatchEvent(new MouseEvent('click'))
        },

        openFile() {
            const files = this.$refs.fileInput.files

            if (files.length) {
                this.sourceOption = this.file = files[0]
            }
        },

        enterUrl() {
            this.enteringUrl = true
            this.$nextTick(() => this.$refs.mediaUrl.focus())
        },

        openUrl() {
            if (this.$refs.mediaUrl.validity.valid) {
                // Get only the content type of the resource pointed to by the URL,
                // the sourceOption watcher will do the rest
                fetch(this.mediaUrl, { method: 'HEAD' })
                    .then(response => this.sourceOption = this.mediaResponse = response)
                    .catch(error => this.errorHandler(error))

            } else {
                this.sourceOption = null
            }

            this.enteringUrl = false
        },

        errorHandler(error) {
            this.error = `${error}. The resource may have been blocked by the server's CORS policy.`
            this.sourceOption = null
        },
    },
}
</script>

<style scoped>
h4 {
    text-align: center;
    margin: 1rem 0;
}

h4 > span {
    margin-right: 2em;
}

img.info {
    vertical-align: text-bottom;
    margin-left: 0.5em;
}

.row {
    max-width: 80rem;
}

.error {
    color: crimson;
}

.barcode-scanner {
    display: flex;
    justify-content: center;
}

table {
    table-layout:fixed;
}

th, td {
    text-align: center;
}

td > pre {
    margin: 0;
    text-align: left;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow: hidden;
}

td > input[type='checkbox'] {
    margin: 0;
    pointer-events: none;
}

#source-container {
    position: relative;
}

#source-container input {
    position: absolute;
    top: 0;
    left: 0;
}

#formats {
    font-family: monospace, monospace;
    height: inherit;
    overflow-y: auto;
}

#formats ~ .note {
    margin-top: -1.5rem;
    margin-bottom: 1.5rem;
}

input[type='radio'] + span {
    margin: 0 0.5em;
}

input[type='file'] {
    display: none;
}

img.info + input {
    margin-left: 1em;
}
</style>
