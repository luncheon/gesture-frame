# gesture-frame

A Web Component that supports `pinch-zoom` and `pan` for PC and Touch Devices.

Demo: https://luncheon.github.io/gesture-frame/

## Usage

```html
<link rel="stylesheet" href="gesture-frame/gesture-frame.css" />
<script type="module" src="gesture-frame/gesture-frame.js"></script>

<gesture-frame pan-x pan-y pinch-zoom><!-- Content --></gesture-frame>
```

or using module bundler:

```ts
import 'gesture-frame/gesture-frame.css';
import 'gesture-frame/gesture-frame.js';

const gestureFrame = document.createElement('gesture-frame');
```

If you use TypeScript and need the custom element type, import it separately.

```ts
import { GestureFrame } from 'gesture-frame';
import 'gesture-frame/gesture-frame.css';
import 'gesture-frame/gesture-frame.js';

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
