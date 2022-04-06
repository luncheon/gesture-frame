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
  static readonly observedAttributes: readonly string[] = ['scale', 'min-scale', 'max-scale', 'offset-x', 'offset-y'];

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

  #marginX = 0;
  #marginY = 0;
  readonly #container;
  readonly #topLeft;
  readonly #content;
  readonly #disableScrollEventTemporarily;

  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = '<div part=container><div part=top-left></div><slot part=content></slot></div>';
    this.#container = shadowRoot.firstElementChild as HTMLDivElement;
    this.#topLeft = this.#container.firstElementChild as HTMLDivElement;
    this.#content = this.#topLeft.nextElementSibling as HTMLSlotElement;
    {
      let isScrollEventEnabled = 1;
      const [reserveListeningScrollEvent] = throttle(() => (isScrollEventEnabled = 1));
      this.#disableScrollEventTemporarily = () => {
        reserveListeningScrollEvent();
        isScrollEventEnabled = 0;
      };
      this.addEventListener('scroll', () => {
        if (isScrollEventEnabled) {
          const offset = this.#getCTMs()[0].transformPoint({ x: this.#marginX - this.scrollLeft, y: this.#marginY - this.scrollTop });
          this.#setAttribute('offset-x', (this.#offsetX = offset.x));
          this.#setAttribute('offset-y', (this.#offsetY = offset.y));
        }
      });
    }
  }

  #isAttributeChangedCallbackEnabled = 1;
  #setAttribute(name: string, value: string | number) {
    this.#isAttributeChangedCallbackEnabled = 0;
    this.setAttribute(name, value as string & number);
    this.#isAttributeChangedCallbackEnabled = 1;
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (this.#isAttributeChangedCallbackEnabled && oldValue !== newValue) {
      this[name.replace(/-([a-z])/g, (_, $1) => $1.toUpperCase()) as 'scale' | 'minScale' | 'maxScale' | 'offsetX' | 'offsetY'] = +newValue;
    }
  }

  connectedCallback() {
    this.setAttribute('scale', this.#scale as string & number);
    this.setAttribute('min-scale', this.#minScale as string & number);
    this.setAttribute('max-scale', this.#maxScale as string & number);
  }

  #memoizedCTMString = '';
  #memoizedCTMs = [new DOMMatrixReadOnly(), new DOMMatrixReadOnly()] as const;
  #getCTMs() {
    let ctmString = '';
    for (let element: Element | null = this; element; element = element.parentElement) {
      const transform = getComputedStyle(element).transform;
      transform && transform !== 'none' && (ctmString = `${transform} ${ctmString}`);
    }
    if (this.#memoizedCTMString !== ctmString) {
      const ctm = new DOMMatrix(ctmString);
      ctm.e = ctm.f = 0;
      this.#memoizedCTMString = ctmString;
      this.#memoizedCTMs = [DOMMatrixReadOnly.fromMatrix(ctm), DOMMatrixReadOnly.fromMatrix(ctm.inverse())];
    }
    return this.#memoizedCTMs;
  }

  setOffset(offsetX: number, offsetY: number) {
    if (this.#offsetX === offsetX && this.#offsetY === offsetY) {
      return;
    }
    this.#setAttribute('offset-x', (this.#offsetX = offsetX));
    this.#setAttribute('offset-y', (this.#offsetY = offsetY));
    const { x, y } = this.#getCTMs()[1].transformPoint({ x: offsetX, y: offsetY });
    const containerStyle = this.#container.style;
    containerStyle.margin = `${(this.#marginY = clampZero(y))}px 0 0 ${(this.#marginX = clampZero(x))}px`;
    containerStyle.width = `${x < 0 ? this.clientWidth - x : 0}px`;
    containerStyle.height = `${y < 0 ? this.clientHeight - y : 0}px`;
    this.#disableScrollEventTemporarily();
    this.scrollTo(clampZero(-x), clampZero(-y));
  }

  zoom(scaleRatio: number, originClientX: number, originClientY: number) {
    const previousScale = this.#scale;
    const scale = clamp(previousScale * scaleRatio, this.#minScale, this.#maxScale);
    if (scale === previousScale) {
      return;
    }
    const offsetScale = scale / previousScale - 1;
    const topLeft = this.#topLeft.getBoundingClientRect();
    this.scale = scale;
    this.setOffset(this.#offsetX + offsetScale * (topLeft.x - originClientX), this.#offsetY + offsetScale * (topLeft.y - originClientY));
  }
}

const createWheelListener = (element: ScrollableFrame) => {
  let scaleRatio = 1;
  let clientX: number;
  let clientY: number;
  const [reserveZooming] = throttle(() => {
    element.zoom(scaleRatio, clientX, clientY);
    scaleRatio = 1;
  });
  return (event: WheelEvent) => {
    if (event.ctrlKey) {
      event.preventDefault();
      scaleRatio *= 0.98 ** event.deltaY;
      ({ clientX, clientY } = event);
      reserveZooming();
    }
  };
};

const createPointerListeners = (element: ScrollableFrame): [() => void, () => void] => {
  let previousClientX: number;
  let previousClientY: number;
  let clientX: number;
  let clientY: number;
  const [reservePanning] = throttle(() => {
    // do not use movementX/Y, that do not aware page zoom
    element.setOffset(element.offsetX + clientX - previousClientX, element.offsetY + clientY - previousClientY);
    previousClientX = clientX;
    previousClientY = clientY;
  });
  const onPointerDown = (event: PointerEvent) => {
    (event.currentTarget as ScrollableFrame).setPointerCapture(event.pointerId);
    ({ clientX: previousClientX, clientY: previousClientY } = event);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (event.buttons === 1) {
      event.preventDefault();
      ({ clientX, clientY } = event);
      reservePanning();
    }
  };
  const onWheel = createWheelListener(element);
  return [
    () => {
      element.addEventListener('wheel', onWheel);
      element.addEventListener('pointerdown', onPointerDown);
      element.addEventListener('pointermove', onPointerMove);
    },
    () => {
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
    },
  ];
};

interface TouchPoint {
  readonly x: number;
  readonly y: number;
  readonly d: number;
}
const createTouchListeners = (element: ScrollableFrame): [() => void, () => void] => {
  let previousPoint: TouchPoint = { x: 0, y: 0, d: 0 };
  let points: TouchPoint[] = [];
  const [reservePanZoom, cancelPanZoom] = throttle(() => {
    const x = averageBy(points, (p) => p.x);
    const y = averageBy(points, (p) => p.y);
    const d = previousPoint.d && averageBy(points, (p) => p.d);
    d && element.zoom(d / previousPoint.d, x, y);
    element.setOffset(element.offsetX + x - previousPoint.x, element.offsetY + y - previousPoint.y);
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
  const onTouchMove = (event: TouchEvent) => {
    event.preventDefault();
    points.push(calculatePoint(event));
    reservePanZoom();
  };
  const nonPassive: AddEventListenerOptions = { passive: false };
  return [
    () => {
      element.addEventListener('touchstart', onTouchStartEnd);
      element.addEventListener('touchend', onTouchStartEnd);
      element.addEventListener('touchmove', onTouchMove, nonPassive);
    },
    () => {
      element.removeEventListener('touchstart', onTouchStartEnd);
      element.removeEventListener('touchend', onTouchStartEnd);
      element.removeEventListener('touchmove', onTouchMove, nonPassive);
    },
  ];
};

export class PinchFrame extends ScrollableFrame {
  static override readonly observedAttributes: readonly string[] = [...super.observedAttributes, 'disabled'];

  readonly #addRemoveListeners = typeof ontouchend === 'undefined' ? createPointerListeners(this) : createTouchListeners(this);

  #disabled = false;
  get disabled() {
    return this.#disabled;
  }
  set disabled(disabled: boolean) {
    disabled = !!disabled;
    if (this.#disabled !== disabled) {
      if ((this.#disabled = disabled)) {
        this.#addRemoveListeners[1]();
        this.setAttribute('disabled', '');
      } else {
        this.#addRemoveListeners[0]();
        this.removeAttribute('disabled');
      }
    }
  }

  constructor() {
    super();
    this.#addRemoveListeners[0]();
  }

  override attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === 'disabled') {
      this.disabled = newValue !== null;
    } else {
      super.attributeChangedCallback(name, oldValue, newValue);
    }
  }
}

customElements.define('pinch-frame', PinchFrame);
