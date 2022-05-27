# gesture-frame

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
```

If you use TypeScript and need the custom element type and the [`preserveValueImports`](https://www.typescriptlang.org/tsconfig#preserveValueImports) option is not set to `true`, import it separately.

```ts
import { GestureFrame } from 'gesture-frame';
import 'gesture-frame/gesture-frame.css';
import 'gesture-frame/gesture-frame.js'; // when { "preserveValueImports": true }, this line is not necessary.

// type usage
const gestureFrame: GestureFrame = document.createElement('gesture-frame');

// constructor usage
if (gestureFrame instanceof GestureFrame) {
}
```

## Interface: HTML Attributes and JavaScript Properties

### States (auto-updated by panning and zooming)

| HTML Attribute | JavaScript Property | Default | Description  |
| -------------- | ------------------- | ------- | ------------ |
| `scale`        | `scale`             | `1`     | Scale.       |
| `offset-x`     | `offsetX`           | `0`     | Left margin. |
| `offset-y`     | `offsetY`           | `0`     | Top margin.  |

These attributes can be observed using [`MutationObserver`](https://developer.mozilla.org/docs/Web/API/MutationObserver).

### Options

| HTML Attribute           | JavaScript Property | Default | Description                                                                                     |
| ------------------------ | ------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `min-scale`              | `minScale`          | `0.1`   | Minimum scale.                                                                                  |
| `max-scale`              | `maxScale`          | `100`   | Maximum scale.                                                                                  |
| `pan-x` (existence)      | `panX`              | `false` | Whether horizontal panning is enabled.                                                          |
| `pan-y` (existence)      | `panY`              | `false` | Whether vertical panning is enabled.                                                            |
| `pinch-zoom` (existence) | `pinchZoom`         | `false` | Whether two-finger panning and zooming is enabled. For PC, follows `Ctrl + Wheel` events.       |
| `pan-button`             | `panButton`         | `0`     | [Mouse button](https://developer.mozilla.org/docs/Web/API/MouseEvent/button) for panning on PC. |

## License

[WTFPL](http://www.wtfpl.net)

## Similar Libraries

- https://github.com/GoogleChromeLabs/pinch-zoom
- https://github.com/worka/vanilla-js-wheel-zoom
