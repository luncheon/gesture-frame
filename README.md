# &lt;gesture-frame&gt;

A Web Component that supports `pinch-zoom` and `pan` for PC and touch devices.

Demo: https://luncheon.github.io/gesture-frame/

## Installation

```
npm i gesture-frame
```

## Usage

```html
<link rel="stylesheet" href="gesture-frame/gesture-frame.css">
<script type="module" src="gesture-frame/gesture-frame.js"></script>

<gesture-frame pan-x pan-y pinch-zoom min-scale="0.01" max-scale="1000" scale="2" offset-x="20" offset-y="20">
  <!-- Content -->
</gesture-frame>
```

or using module bundler:

```ts
import 'gesture-frame/gesture-frame.css';
import 'gesture-frame/gesture-frame.js';

const gestureFrame = document.createElement('gesture-frame');
gestureFrame.pinchZoom = true;
gestureFrame.minScale = 0.01;
gestureFrame.fit({ marginX: 20, marginY: 20 });
```

If you use TypeScript with *import elision* and need the custom element type, import it separately.

See:

- [`verbatimModuleSyntax` option](https://www.typescriptlang.org/tsconfig#verbatimModuleSyntax)
- [`preserveValueImports` option (deprecated)](https://www.typescriptlang.org/tsconfig#preserveValueImports)
- [`importsNotUsedAsValues` option (deprecated)](https://www.typescriptlang.org/tsconfig#importsNotUsedAsValues)

```ts
import { GestureFrame } from 'gesture-frame';
import 'gesture-frame/gesture-frame.css';
import 'gesture-frame/gesture-frame.js'; // when *import elision* is disabled, this line is not necessary.

// type usage
const gestureFrame: GestureFrame = document.createElement('gesture-frame');

// constructor usage
if (gestureFrame instanceof GestureFrame) {
}
```

## HTML Attributes and DOM Element Properties

### States (auto-updated by panning and zooming)

| HTML Attribute | DOM Element Property | Default | Description  |
| -------------- | -------------------- | ------- | ------------ |
| `scale`        | `scale`              | `1`     | Scale.       |
| `offset-x`     | `offsetX`            | `0`     | Left margin. |
| `offset-y`     | `offsetY`            | `0`     | Top margin.  |

These attributes can be observed using [`MutationObserver`](https://developer.mozilla.org/docs/Web/API/MutationObserver).

### Options

| HTML Attribute           | DOM Element Property | Default | Description                                                                                     |
| ------------------------ | -------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `min-scale`              | `minScale`           | `0.1`   | Minimum scale.                                                                                  |
| `max-scale`              | `maxScale`           | `100`   | Maximum scale.                                                                                  |
| `pan-x` (existence)      | `panX`               | `false` | Whether horizontal panning is enabled.                                                          |
| `pan-y` (existence)      | `panY`               | `false` | Whether vertical panning is enabled.                                                            |
| `pinch-zoom` (existence) | `pinchZoom`          | `false` | Whether two-finger panning and zooming is enabled. For PC, follows `Ctrl + Wheel` events.       |
| `pan-button`             | `panButton`          | `0`     | [Mouse button](https://developer.mozilla.org/docs/Web/API/MouseEvent/button) for panning on PC. |
| `anchor-left`<br>`anchor-right`<br>`anchor-top`<br>`anchor-bottom`<br>(existence) | `anchorLeft`<br>`anchorRight`<br>`anchorTop`<br>`anchorBottom`           | `false`<br>`false`<br>`false`<br>`false`   | Edges to which the content is bound. When the element is resized, the content is resized while keeping the distance from the bound edges.<br>\* Only up to three anchors can be set; if all anchors are set, only the left and right anchors will be enabled. |

## DOM Element API

### `fit(options?: { marginX?: number, marginY?: number }): void`

Adjust the scale and offset to display the entire content.

### `fitX(options?: { margin?: number }): void`

Adjust the scale and offset-x to fit the width.

### `fitY(options?: { margin?: number }): void`

Adjust the scale and offset-y to fit the height.

### ``zoom(scaleRatio: number, origin?: { x?: number | `${number}%`, y?: number | `${number}%`): void``

Zoom keeping the apparent position of `(origin.x, origin.y)`. Zoom in when `scaleRatio > 1` and zoom out when `scaleRatio < 1`. `origin.x` and `origin.y` can be specified as a `number` (px) or a `` `${number}%` ``. The default value for both is `"50%"` (center).

## License

[WTFPL](http://www.wtfpl.net)

## Similar Libraries

- https://github.com/GoogleChromeLabs/pinch-zoom
- https://github.com/worka/vanilla-js-wheel-zoom
