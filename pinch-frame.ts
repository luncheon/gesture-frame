const clamp = (x: number, min: number, max: number) => (x < min ? min : x > max ? max : x);
const clampZero = (x: number) => (x < 0 ? 0 : x);

const sumBy = <T>(items: ArrayLike<T>, selector: (item: T) => number) => {
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += selector(items[i]!);
  }
  return sum;
};

const averageBy = <T>(items: ArrayLike<T>, selector: (item: T) => number) =>
  items.length === 1 ? selector(items[0]!) : sumBy(items, selector) / items.length;

const throttle = (callback: () => void): [() => void, () => void] => {
  let handle: number | undefined;
  const wrappedCallback = () => ((handle = undefined), callback());
  return [
    () => (handle ??= requestAnimationFrame(wrappedCallback)),
    () => handle !== undefined && (cancelAnimationFrame(handle), (handle = undefined)),
  ];
};

class ScrollableFrame extends HTMLElement {
  static readonly observedAttributes = ['scale', 'min-scale', 'max-scale', 'offset-x', 'offset-y'] as const;

  #scale = 1;
  get scale() {
    return this.#scale;
  }
  set scale(scale) {
    if (this.#scale !== scale) {
      this.#setAttribute('scale', (this.#scale = scale = clamp(scale, this.#minScale, this.#maxScale)));
      this.#content.style.transform = `scale(${scale})`;
    }
  }

  #minScale = 0.1;
  get minScale() {
    return this.#minScale;
  }
  set minScale(minScale) {
    if (this.#minScale !== minScale && minScale > 0) {
      this.#setAttribute('min-scale', (this.#minScale = minScale));
      this.#scale < minScale && (this.scale = minScale);
    }
  }

  #maxScale = 100;
  get maxScale() {
    return this.#maxScale;
  }
  set maxScale(maxScale) {
    if (this.#maxScale !== maxScale && maxScale > 0) {
      this.#setAttribute('max-scale', (this.#maxScale = maxScale));
      this.#scale > maxScale && (this.scale = maxScale);
    }
  }

  #offsetX = 0;
  get offsetX() {
    return this.#offsetX;
  }
  set offsetX(offsetX) {
    this.setOffset(offsetX, this.#offsetY);
  }

  #offsetY = 0;
  get offsetY() {
    return this.#offsetY;
  }
  set offsetY(offsetY) {
    this.setOffset(this.#offsetX, offsetY);
  }

  readonly #container; // necessary to get the bounding box without scrollbar
  readonly #content;
  readonly #ignoreScrollEventTemporarily;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = '<div part=container><slot part=content></slot></div>';
    this.#content = (this.#container = this.shadowRoot!.firstElementChild as HTMLDivElement).firstElementChild as HTMLSlotElement;
    {
      let ignoresScrollEvent = false;
      const [reserveListeningScrollEvent] = throttle(() => (ignoresScrollEvent = false));
      this.#ignoreScrollEventTemporarily = () => {
        reserveListeningScrollEvent();
        ignoresScrollEvent = true;
      };
      this.addEventListener('scroll', ({ currentTarget }: Event) => {
        if (!ignoresScrollEvent) {
          const contentStyle = this.#content.style;
          this.#setAttribute('offset-x', (this.#offsetX = parseFloat(contentStyle.marginLeft) - (currentTarget as this).scrollLeft));
          this.#setAttribute('offset-y', (this.#offsetY = parseFloat(contentStyle.marginTop) - (currentTarget as this).scrollTop));
        }
      });
    }
  }

  #ignoresAttributeChangedCallback = false;
  #setAttribute(name: typeof ScrollableFrame.observedAttributes[number], value: string | number) {
    this.#ignoresAttributeChangedCallback = true;
    this.setAttribute(name, value as string & number);
    this.#ignoresAttributeChangedCallback = false;
  }

  attributeChangedCallback(name: typeof ScrollableFrame['observedAttributes'][number], oldValue: string, newValue: string) {
    if (!this.#ignoresAttributeChangedCallback && oldValue !== newValue) {
      this[name.replace(/-([a-z])/g, (_, $1) => $1.toUpperCase()) as 'scale' | 'minScale' | 'maxScale' | 'offsetX' | 'offsetY'] = +newValue;
    }
  }

  connectedCallback() {
    this.setAttribute('scale', this.#scale as string & number);
    this.setAttribute('min-scale', this.#minScale as string & number);
    this.setAttribute('max-scale', this.#maxScale as string & number);
    setTimeout(() => {
      const rect = this.#container.getBoundingClientRect();
      const contentRect = this.#content.getBoundingClientRect();
      this.setOffset((rect.width - contentRect.width) / 2, (rect.height - contentRect.height) / 2);
    });
  }

  setOffset(offsetX: number, offsetY: number) {
    if (this.#offsetX === offsetX && this.#offsetY === offsetY) {
      return;
    }
    this.#setAttribute('offset-x', (this.#offsetX = offsetX));
    this.#setAttribute('offset-y', (this.#offsetY = offsetY));
    const contentStyle = this.#content.style;
    contentStyle.margin = `${clampZero(offsetY)}px 0 0 ${clampZero(offsetX)}px`;
    contentStyle.padding = '0';
    const rect = this.#container.getBoundingClientRect();
    const contentRect = this.#content.getBoundingClientRect();
    contentStyle.padding = `0 ${offsetX < 0 ? clampZero(rect.width - contentRect.width - offsetX) : 0}px ${
      offsetY < 0 ? clampZero(rect.height - contentRect.height - offsetY) : 0
    }px 0`;
    this.#ignoreScrollEventTemporarily();
    this.scrollTo(clampZero(-offsetX), clampZero(-offsetY));
  }

  zoom(scaleRatio: number, originClientX: number, originClientY: number) {
    const previousScale = this.#scale;
    const scale = clamp(previousScale * scaleRatio, this.#minScale, this.#maxScale);
    if (scale === previousScale) {
      return;
    }
    const offsetScale = scale / previousScale - 1;
    const contentRect = this.#content.getBoundingClientRect();
    this.scale = scale;
    this.setOffset(
      this.#offsetX - offsetScale * (originClientX - contentRect.x),
      this.#offsetY - offsetScale * (originClientY - contentRect.y),
    );
  }
}

interface TouchPoint {
  readonly x: number;
  readonly y: number;
  readonly d: number;
}

class PinchFrame extends ScrollableFrame {
  constructor() {
    super();
    if (typeof ontouchend === 'undefined') {
      {
        let scaleRatio = 1;
        let clientX: number;
        let clientY: number;
        const [reserveZooming] = throttle(() => {
          this.zoom(scaleRatio, clientX, clientY);
          scaleRatio = 1;
        });
        this.addEventListener('wheel', (event) => {
          if (event.ctrlKey) {
            event.preventDefault();
            scaleRatio *= 0.98 ** event.deltaY;
            ({ clientX, clientY } = event);
            reserveZooming();
          }
        });
      }
      {
        let previousClientX: number;
        let previousClientY: number;
        let clientX: number;
        let clientY: number;
        const [reservePanning] = throttle(() => {
          // do not use movementX/Y, that do not aware page zoom
          this.setOffset(this.offsetX + clientX - previousClientX, this.offsetY + clientY - previousClientY);
          previousClientX = clientX;
          previousClientY = clientY;
        });
        this.addEventListener('pointerdown', (event) => {
          (event.currentTarget as this).setPointerCapture(event.pointerId);
          ({ clientX: previousClientX, clientY: previousClientY } = event);
        });
        this.addEventListener('pointermove', (event) => {
          if (event.buttons === 1) {
            event.preventDefault();
            ({ clientX, clientY } = event);
            reservePanning();
          }
        });
      }
    } else {
      let previousPoint: TouchPoint = { x: 0, y: 0, d: 0 };
      let points: TouchPoint[] = [];
      const [reservePanZoom, cancelPanZoom] = throttle(() => {
        const x = averageBy(points, (p) => p.x);
        const y = averageBy(points, (p) => p.y);
        const d = previousPoint.d && averageBy(points, (p) => p.d);
        d && this.zoom(d / previousPoint.d, x, y);
        this.setOffset(this.offsetX + x - previousPoint.x, this.offsetY + y - previousPoint.y);
        points = [];
        previousPoint = { x, y, d };
      });
      const calculatePoint = ({ touches }: TouchEvent): TouchPoint => ({
        x: averageBy(touches, (touch) => touch.clientX),
        y: averageBy(touches, (touch) => touch.clientY),
        d: touches.length > 1 ? Math.hypot(touches[0]!.clientX - touches[1]!.clientX, touches[0]!.clientY - touches[1]!.clientY) : 0,
      });
      const onTouchStartEnd = (event: TouchEvent) => {
        cancelPanZoom();
        points = [];
        event.touches.length !== 0 && (previousPoint = calculatePoint(event));
      };
      this.addEventListener('touchstart', onTouchStartEnd);
      this.addEventListener('touchend', onTouchStartEnd);
      this.addEventListener(
        'touchmove',
        (event) => {
          event.preventDefault();
          points.push(calculatePoint(event));
          reservePanZoom();
        },
        { passive: false },
      );
    }
  }
}

customElements.define('pinch-frame', PinchFrame);
