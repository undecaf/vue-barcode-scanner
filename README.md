# A barcode/QR code scanner for Vue 2

![Minified size](https://badgen.net/packagephobia/install/@undecaf/vue-barcode-scanner?color=42cc24)
![Open issues](https://badgen.net/github/open-issues/undecaf/vue-barcode-scanner)
![Vulnerabilities](https://snyk.io/test/npm/@undecaf/vue-barcode-scanner/badge.svg)
![Total downloads](https://badgen.net/npm/dt/@undecaf/vue-barcode-scanner)
[![](https://badgen.net/jsdelivr/hits/npm/@undecaf/vue-barcode-scanner)](https://www.jsdelivr.com/package/npm/@undecaf/vue-barcode-scanner)
![License](https://badgen.net/github/license/undecaf/vue-barcode-scanner)

This Vue component, `BarcodeScanner`, offers the following features:

+ Scans `<img>`, `<canvas>` and live `<video>` elements, `MediaStream`s (cameras), 
  image and video `Blob`s and `File`s and more
+ Renders sources that are not DOM elements (e.g. `MediaStream`, `File`) automatically
+ Reports detected barcodes, status and errors as events
+ Scans videos repeatedly as long as they are playing
+ Can restrict scanning to a region of the source area
+ Applies user-defined styles to the scanning region and for highlighting detected barcodes
+ Handles source and configuration changes reactively
+ Relies on the
  [Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API)
  or on any available polyfill
+ Detects all barcodes that
  [the underlying `BarcodeDetector`](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API#supported_barcode_formats)
  or polyfill supports
+ Adapts the scanning frequency automatically to stay below a configurable processing load limit

Try these features on this [online example](https://undecaf.github.io/vue-barcode-scanner/example/)
([source code](https://github.com/undecaf/vue-barcode-scanner/blob/master/example)
with build scripts for Rollup and Webpack/Vue CLI).


## Contents

+ [Installation](#installation)
  + [As ES module](#as-es-module)
  + [As plain `<script>`](#as-plain-script)
  + [Polyfilling `BarcodeDetector`](#polyfilling-barcodedetector)
+ [Usage](#usage)
  + [Source element](#source-element)
  + [Attributes](#attributes)
    + [`source`](#source)
    + [`formats`](#formats)
    + [`mask-css`](#mask-css)
    + [`highlight-css`](#highlight-css)
    + [`scanning`](#scanning)
    + [`rate`](#rate)
    + [`debug`](#debug)
  + [Getting results: events](#getting-results-events)
    + [`bcs-scanned`](#bcs-scanned)
    + [`bcs-started`](#bcs-started)
    + [`bcs-stopped`](#bcs-stopped)
    + [`bcs-error`](#bcs-error)
+ [License](#license)

  
## Installation

### As ES module

```shell script
$ npm install @undecaf/vue-barcode-scanner
    or
$ yarn add @undecaf/vue-barcode-scanner
```

Then `import BarcodeScanner from '@undecaf/vue-barcode-scanner'` where required and place as
`<barcode-scanner>` in your template. [This CodePen](https://codepen.io/undecaf/pen/xxXBapJ)
demonstrates the scanner in a Vue SFC.


### As plain `<script>`

```html
<script src="https://cdn.jsdelivr.net/npm/@undecaf/vue-barcode-scanner/dist/index.js"></script>
```

This exposes the component options object as `barcodeScanner.default`.
[This CodePen](https://codepen.io/undecaf/pen/wvrOOEZ) shows the scanner in a Vue `<script>`.


### Polyfilling `BarcodeDetector`

`BarcodeScanner` relies on the [Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API)
to do its work. For [browsers that do not yet implement this API](https://caniuse.com/mdn-api_barcodedetector),
a polyfill will be required.

The following snippets use
[`@undecaf/barcode-detector-polyfill`](https://www.npmjs.com/package/@undecaf/barcode-detector-polyfill)
(written by the same author as this component) as an example.

Polyfill if necessary in an ES module (also shown in [this CodePen](https://codepen.io/undecaf/pen/xxXBapJ)):

```javascript
import { BarcodeDetectorPolyfill } from '@undecaf/barcode-detector-polyfill'

try {
    window['BarcodeDetector'].getSupportedFormats()
} catch {
    window['BarcodeDetector'] = BarcodeDetectorPolyfill
}
    ⁝
```

In a plain `<script>` (shown in [this CodePen](https://codepen.io/undecaf/pen/wvrOOEZ)):

```html
<script src="https://cdn.jsdelivr.net/npm/@undecaf/zbar-wasm/dist/index.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@undecaf/barcode-detector-polyfill/dist/index.js"></script>
<script>
    try {
        window['BarcodeDetector'].getSupportedFormats()
    } catch {
        window['BarcodeDetector'] = barcodeDetectorPolyfill.BarcodeDetectorPolyfill
    }
        ⁝
</script>
```


## Usage

### Source element

`BarcodeScanner` needs an image or video source that is to be scanned for barcodes.
This can be an `<img>`, `<canvas>` or `<video>` element, or a container or a Vue component
having one of these elements as descendant (for other source types, see the [`source` attribute](#source)).
For example:

```html
<barcode-scanner ...>
  <video ...></video>
</barcode-scanner>
```

The source element/container must be the only child of `<barcode-scanner>`.
If located inside a container then `<img>`/`<canvas>`/`<video>` must cover that container exactly 
in order for [masks](#mask-css) and [barcode highlights](#highlight-css) to appear in correct positions.
The [`source` attribute](#source) may specify a CSS selector for a particular source element inside the container.

The source element and its `src` and `srcObject` attributes are reactive, i.e. changed content
is scanned automatically. Video sources are scanned repeatedly while being played.
To scan animated `<canvas>` content, [capture it as `MediaStream`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream)
and pass that to the [`source` attribute](#source).


### Attributes

All attributes are reactive. Try them in the [example project](https://undecaf.github.io/vue-barcode-scanner/example/)!

+ <a name="source">`source`</a>: the image/video source that is to be shown/played inside `<barcode-scanner>`
  and that is to be scanned for barcodes.
  Must be specified if `<barcode-scanner>` does not contain a [source element](#source-element).

  May be any of:
  + [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
    and [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File)
    with any `image/*` or `video/*` type supported by the browser
  + [`MediaStream`](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
  + [`ImageData`](https://developer.mozilla.org/en-US/docs/Web/API/ImageData/ImageData)
  + [`ImageBitmap`](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap)
  + [`OffscreenCanvas`](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)

  `MediaStream` and `video/*` `Blob`s/`File`s are scanned repeatedly while being played, see [`rate`](#rate) below.

  If the [source element](#source-element) is a container with multiple `<img>`, `<canvas>` or `<video>`
  elements then `source` must be a 
  [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
  that selects one of them.

+ <a name="formats">`formats`</a> (optional): a string array of the barcode formats to be detected. Getting the available formats:

  ```javascript
  const formats = await BarcodeDetector.getSupportedFormats()
  ```
  
  If this attribute is omitted then all available formats will be detected.

+ <a name="mask-css">`mask-css`</a> (optional): the CSS class(es) for a `<div>` that overlays the source and defines 
  a reduced scanning area.
  Only content inside the border box of that `<div>` will be scanned if this attribute is specified.
  This can increase performance considerably.

  The `<div>` is managed by the `BarcodeScanner` component. `position:absolute` is enforced, and coordinates and dimensions
  should be specified as `%` of the source size. For example:

  ```css
  .centered-mask {  /* centered, 50% of source width, 80% of source height */
    left: 25%;
    top: 10%;
    width: 50%;
    height: 80%;
    box-shadow: 0 0 0 10000px rgba(0, 0, 0, 0.4);  /* dims the surrounding area */
  }
  ```
  
  CSS class `.detected` is added to the `<div>` automatically if any barcode was detected.
  The names of the detected barcode `format`s (in original spelling and in kebab case)
  are also added as CSS classes. This allows visual feedback on detection, for example:

  ```css
  .centered-mask.detected {   /* green border on barcode detection */
    border: rgb(128, 255, 128) solid 3px;
  }
  
  .centered-mask.qr-code::before {    /* shows the detected format as text */
    content: "It's a QR code!";
    display: block;
    text-align: center;
    color: rgb(255, 255, 255);
    background-color: rgb(128, 255, 128);
  }
  ```
  
  More examples can be found in the [example styles](https://github.com/undecaf/vue-barcode-scanner/blob/master/example/src/css).

+ <a name="highlight-css">`highlight-css`</a> (optional): the CSS class(es) for the `<div>`s that each enclose a detected barcode. 
  These `<div>`s are placed and sized automatically, therefore the CSS styles must not affect their position and size.
  For example:

  ```css
  .simple-highlight {   /* blue border and translucent blue background */
    border: rgb(64, 64, 255) solid 2px;
    background-color: rgba(64, 64, 255, 0.3);
  }
  ```
  
  Each `<div>` also receives the name of the respective barcode `format` (in original spelling and in kebab case)
  as additional CSS classes. This allows format-specific highlighting, for example:

  ```css
  .simple-highlight.code-39 {   /* highlights code 39 barcodes in red */
    border-color: rgb(255, 64, 64);
    background-color: rgba(255, 64, 64, 0.3);
  }
  ```
  
  More examples can be found in the [example styles](https://github.com/undecaf/vue-barcode-scanner/blob/master/example/src/css).

  If this property is omitted then detected barcodes will be enclosed in a green (`#80ff80`) border.
  To disable highlighting entirely, set `:highlight-css="null"`.

+ <a name="scanning">`scanning`</a> (optional): as a `boolean` input, starts and stops scanning; as a`boolean` output,
  indicates whether scanning is in progress. In order to work in this bidirectional mode, a _variable_ must be bound with the
  [`.sync` modifier](https://vuejs.org/v2/guide/components-custom-events.html#sync-Modifier).

  Usually this attribute is not needed because scanning starts automatically whenever the source, 
  [`formats`](#formats) or [`mask-css`](#mask-css) changes.

+ <a name="rate">`rate`</a> (optional): the desired scans per second as a string like `15/s`, or the JavaScript
  processing load limit for repeated scanning as a string like `50%`. The numbers must be integers.

  If missing or invalid then `rate` defaults to `20/s`.

+ <a name="debug">`debug`</a> (optional): if `true` then debug messages and events are logged at the console; defaults to `false`.
  This impacts performance, not recommended for production. 


### Getting results: events

+ <a name="bcs-scanned">`bcs-scanned`</a>: emitted after each scan cycle, regardless of whether a barcode was detected or not.
  Detected barcodes are passed as an array of objects in the event payload, one element per barcode.
  Each object has the following properties
  ([see here for details](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector/detect#return_value)):

  + `format`: the detected barcode format (one of the specified [`formats`](#formats))
  + `rawValue`: the decoded barcode, always a `string` decoded from raw data
  + `boundingBox`: the [`DOMRectReadOnly`](https://developer.mozilla.org/en-US/docs/Web/API/DOMRectReadOnly) enclosing the
    barcode in the `source`
  + `cornerPoints`: an arry of four `{x, y}` pairs in clockwise order, representing four corner points of the detected barcode.
    `BarcodeDetectorPolyfill` returns the `boundingBox` corner points.

  Additional properties may be returned by a `BarcodeDetector` polyfill.

+ <a name="bcs-started">`bcs-started`</a>: signals that scanning has started automatically or as requested by 
  [`scanning`](#scanning) and that one (for an image source)
  or more (for a video source) [`bcs-scanned`](#bcs-scanned) events are to be expected.

+ <a name="bcs-stopped">`bcs-stopped`</a>: emitted after an image source was scanned once or when repeated scanning of a video source
  stopped because the video stopped playing or as requested by [`scanning`](#scanning).

+ <a name="bcs-error">`bcs-error`</a>: indicates an error with the details passed as event payload.
  

If desired then the names of the events described above can be imported as constants:

```javascript
import { SCANNED_EVENT, STARTED_EVENT, STOPPED_EVENT, ERROR_EVENT } from 'undecaf/vue-barcode-scanner'
```

In a [plain script](#as-plain-script), these constants are named `barcodeScanner.SCANNED_EVENT` etc. 

## License

Software: [MIT](http://opensource.org/licenses/MIT)

Documentation: [CC-BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/)
