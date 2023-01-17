const clamp = (x, min, max) => x < min ? min : x > max ? max : x;
const clampZero = (x) => x < 0 ? 0 : x;
const sumBy = (items, selector) => {
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += selector(items[i]);
  }
  return sum;
};
const averageBy = (items, selector) => items.length === 1 ? selector(items[0]) : sumBy(items, selector) / items.length;
const throttle = (callback) => {
  let handle;
  const wrappedCallback = () => (handle = void 0, callback());
  return [
    () => handle ??= requestAnimationFrame(wrappedCallback),
    () => handle !== void 0 && (cancelAnimationFrame(handle), handle = void 0)
  ];
};
class ScrollableFrame extends HTMLElement {
  static observedAttributes = ["scale", "min-scale", "max-scale", "offset-x", "offset-y"];
  #scale = 1;
  get scale() {
    return this.#scale;
  }
  set scale(scale) {
    scale = clamp(scale, this.#minScale, this.#maxScale);
    if (this.#scale !== scale) {
      this.#setAttribute("scale", this.#scale = scale);
      this.#content.style.transform = `scale(${scale})`;
    }
  }
  #minScale = 0.1;
  get minScale() {
    return this.#minScale;
  }
  set minScale(minScale) {
    if (this.#minScale !== minScale && minScale > 0) {
      this.#setAttribute("min-scale", this.#minScale = minScale);
      this.#scale < minScale && (this.scale = minScale);
    }
  }
  #maxScale = 100;
  get maxScale() {
    return this.#maxScale;
  }
  set maxScale(maxScale) {
    if (this.#maxScale !== maxScale && maxScale > 0) {
      this.#setAttribute("max-scale", this.#maxScale = maxScale);
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
  #container;
  #topLeft;
  #content;
  #disableScrollEventTemporarily;
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = "<div part=container><div part=top-left></div><slot part=content></slot></div>";
    this.#container = shadowRoot.firstElementChild;
    this.#topLeft = this.#container.firstElementChild;
    this.#content = this.#topLeft.nextElementSibling;
    {
      let isScrollEventEnabled = 1;
      const [reserveListeningScrollEvent] = throttle(() => isScrollEventEnabled = 1);
      this.#disableScrollEventTemporarily = () => {
        reserveListeningScrollEvent();
        isScrollEventEnabled = 0;
      };
      this.addEventListener("scroll", () => {
        if (isScrollEventEnabled) {
          const offset = this.#getCTMs()[0].transformPoint({ x: this.#marginX - this.scrollLeft, y: this.#marginY - this.scrollTop });
          this.#setAttribute("offset-x", this.#offsetX = offset.x);
          this.#setAttribute("offset-y", this.#offsetY = offset.y);
        }
      });
    }
  }
  #isAttributeChangedCallbackEnabled = 1;
  #setAttribute(name, value) {
    this.#isAttributeChangedCallbackEnabled = 0;
    this.setAttribute(name, value);
    this.#isAttributeChangedCallbackEnabled = 1;
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (this.#isAttributeChangedCallbackEnabled && oldValue !== newValue) {
      this[name.replace(/-([a-z])/g, (_, $1) => $1.toUpperCase())] = +newValue;
    }
  }
  connectedCallback() {
    this.#setAttribute("scale", this.#scale);
    this.#setAttribute("min-scale", this.#minScale);
    this.#setAttribute("max-scale", this.#maxScale);
  }
  #memoizedCTMString = "";
  #memoizedCTMs = [new DOMMatrixReadOnly(), new DOMMatrixReadOnly()];
  #getCTMs() {
    let ctmString = "";
    for (let element = this; element; element = element.parentElement) {
      const transform = getComputedStyle(element).transform;
      transform && transform !== "none" && (ctmString = `${transform} ${ctmString}`);
    }
    if (this.#memoizedCTMString !== ctmString) {
      const ctm = new DOMMatrix(ctmString);
      ctm.e = ctm.f = 0;
      this.#memoizedCTMString = ctmString;
      this.#memoizedCTMs = [DOMMatrixReadOnly.fromMatrix(ctm), DOMMatrixReadOnly.fromMatrix(ctm.inverse())];
    }
    return this.#memoizedCTMs;
  }
  setOffset(offsetX, offsetY) {
    if (this.#offsetX === offsetX && this.#offsetY === offsetY) {
      return;
    }
    this.#setAttribute("offset-x", this.#offsetX = offsetX);
    this.#setAttribute("offset-y", this.#offsetY = offsetY);
    const { x, y } = this.#getCTMs()[1].transformPoint({ x: offsetX, y: offsetY });
    const containerStyle = this.#container.style;
    containerStyle.margin = `${this.#marginY = clampZero(y)}px 0 0 ${this.#marginX = clampZero(x)}px`;
    containerStyle.width = `${x < 0 ? this.clientWidth - x : 0}px`;
    containerStyle.height = `${y < 0 ? this.clientHeight - y : 0}px`;
    this.#disableScrollEventTemporarily();
    this.scrollTo(clampZero(-x), clampZero(-y));
  }
  _zoom(scaleRatio, originClientX, originClientY) {
    const previousScale = this.#scale;
    const scale = clamp(previousScale * scaleRatio, this.#minScale, this.#maxScale);
    if (scale !== previousScale) {
      const offsetScale = scale / previousScale - 1;
      const topLeft = this.#topLeft.getBoundingClientRect();
      this.scale = scale;
      this.setOffset(this.#offsetX + offsetScale * (topLeft.x - originClientX), this.#offsetY + offsetScale * (topLeft.y - originClientY));
    }
  }
  /**
   * Zoom keeping the apparent position of `(origin.x, origin.y)`. Zoom in when `scaleRatio > 1` and zoom out when `scaleRatio < 1`. `origin.x` and `origin.y` can be specified as a `number` (px) or a `` `${number}%` ``. The default value for both is `"50%"` (center).
   */
  zoom(scaleRatio, origin) {
    const rect = this.getBoundingClientRect();
    const x = origin?.x;
    const y = origin?.y;
    this._zoom(
      scaleRatio,
      rect.x + (x === void 0 ? rect.width * 0.5 : typeof x === "number" ? x : rect.width * parseFloat(x) * 0.01),
      rect.y + (y === void 0 ? rect.height * 0.5 : typeof y === "number" ? y : rect.height * parseFloat(y) * 0.01)
    );
  }
  /**
   * Adjust the scale and offset to display the entire content.
   */
  fit(options) {
    const { offsetWidth: width, offsetHeight: height } = this;
    const { offsetWidth: contentWidth, offsetHeight: contentHeight } = this.#content;
    const marginX = options?.marginX ?? 0;
    const marginY = options?.marginY ?? 0;
    const widthBasedScale = (width - marginX - marginX) / contentWidth;
    const heightBasedScale = (height - marginY - marginY) / contentHeight;
    if (widthBasedScale < heightBasedScale) {
      this.scale = widthBasedScale;
      this.setOffset(marginX, Math.floor(height - contentHeight * widthBasedScale) / 2);
    } else {
      this.scale = heightBasedScale;
      this.setOffset(Math.floor(width - contentWidth * heightBasedScale) / 2, marginY);
    }
  }
  /**
   * Adjust the scale and offset-x to fit the width.
   */
  fitX(options) {
    const margin = options?.margin ?? 0;
    this.scale = (this.offsetWidth - margin - margin) / this.#content.offsetWidth;
    this.offsetX = margin;
  }
  /**
   * Adjust the scale and offset-y to fit the height.
   */
  fitY(options) {
    const margin = options?.margin ?? 0;
    this.scale = (this.offsetHeight - margin - margin) / this.#content.offsetHeight;
    this.offsetY = margin;
  }
}
const preventDefault = (event) => event.preventDefault();
const nonPassive = { passive: false };
const isTouchEventEnabled = typeof ontouchend !== "undefined";
class GestureFrame extends ScrollableFrame {
  static observedAttributes = [
    ...super.observedAttributes,
    "pan-x",
    "pan-y",
    "pan-button",
    "pinch-zoom"
  ];
  #setBooleanAttribute(name, oldValue, newValue, setValue) {
    newValue = !!newValue;
    if (oldValue !== newValue) {
      setValue(newValue);
      newValue ? this.setAttribute(name, "") : this.removeAttribute(name);
    }
  }
  #panX = false;
  get panX() {
    return this.#panX;
  }
  set panX(panX) {
    this.#setBooleanAttribute("pan-x", this.#panX, panX, (panX2) => this.#panX = panX2);
  }
  #panY = false;
  get panY() {
    return this.#panY;
  }
  set panY(panY) {
    this.#setBooleanAttribute("pan-y", this.#panY, panY, (panY2) => this.#panY = panY2);
  }
  #panButton = 0;
  get panButton() {
    return this.#panButton;
  }
  set panButton(panButton) {
    if (this.#panButton !== panButton) {
      this.setAttribute("pan-button", this.#panButton = panButton);
      if (panButton === 2) {
        this.addEventListener("contextmenu", preventDefault);
      } else {
        this.removeEventListener("contextmenu", preventDefault);
      }
    }
  }
  #pinchZoom = false;
  get pinchZoom() {
    return this.#pinchZoom;
  }
  set pinchZoom(pinchZoom) {
    this.#setBooleanAttribute("pinch-zoom", this.#pinchZoom, pinchZoom, (pinchZoom2) => this.#pinchZoom = pinchZoom2);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "pan-x") {
      this.panX = newValue !== null;
    } else if (name === "pan-y") {
      this.panY = newValue !== null;
    } else if (name === "pan-button") {
      this.panButton = +newValue || 0;
    } else if (name === "pinch-zoom") {
      this.pinchZoom = newValue !== null;
    } else {
      super.attributeChangedCallback(name, oldValue, newValue);
    }
  }
  constructor() {
    super();
    if (isTouchEventEnabled) {
      let previousPoint = { x: 0, y: 0, d: 0 };
      let points = [];
      let multiTouchPanning;
      const [reservePanZoom, cancelPanZoom] = throttle(() => {
        const x = averageBy(points, (p) => p.x);
        const y = averageBy(points, (p) => p.y);
        const d = previousPoint.d && averageBy(points, (p) => p.d);
        d && this.#pinchZoom && this._zoom(d / previousPoint.d, x, y);
        this.setOffset(
          this.#panX || multiTouchPanning ? this.offsetX + x - previousPoint.x : this.offsetX,
          this.#panY || multiTouchPanning ? this.offsetY + y - previousPoint.y : this.offsetY
        );
        points = [];
        previousPoint = { x, y, d };
      });
      const calculatePoint = ({ touches }) => ({
        x: averageBy(touches, (touch) => touch.clientX),
        y: averageBy(touches, (touch) => touch.clientY),
        d: touches.length > 1 ? Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY) : 0
      });
      const onTouchStartEnd = (event) => {
        cancelPanZoom();
        points = [];
        const touchesLength = event.touches.length;
        multiTouchPanning = this.#pinchZoom && touchesLength > 1;
        touchesLength && (previousPoint = calculatePoint(event));
      };
      const onTouchMove = (event) => {
        if (event.touches.length === 1 ? this.#panX || this.#panY : this.#pinchZoom) {
          event.preventDefault();
          points.push(calculatePoint(event));
          reservePanZoom();
        }
      };
      this.addEventListener("touchstart", onTouchStartEnd);
      this.addEventListener("touchend", onTouchStartEnd);
      this.addEventListener("touchmove", onTouchMove, nonPassive);
    } else {
      {
        let scaleRatio = 1;
        let clientX;
        let clientY;
        const [reserveZooming] = throttle(() => {
          this._zoom(scaleRatio, clientX, clientY);
          scaleRatio = 1;
        });
        this.addEventListener(
          "wheel",
          (event) => {
            if (this.#pinchZoom && event.ctrlKey) {
              event.preventDefault();
              scaleRatio *= 0.99 ** event.deltaY;
              ({ clientX, clientY } = event);
              reserveZooming();
            }
          },
          nonPassive
        );
      }
      {
        let previousClientX;
        let previousClientY;
        let clientX;
        let clientY;
        const [reservePanning] = throttle(() => {
          this.setOffset(
            this.#panX ? this.offsetX + clientX - previousClientX : this.offsetX,
            this.#panY ? this.offsetY + clientY - previousClientY : this.offsetY
          );
          previousClientX = clientX;
          previousClientY = clientY;
        });
        const onPointerMove = (event) => {
          event.preventDefault();
          ({ clientX, clientY } = event);
          reservePanning();
        };
        const onPointerDown = (event) => {
          if ((this.#panX || this.#panY) && event.button === this.#panButton) {
            ({ clientX: previousClientX, clientY: previousClientY } = event);
            this.setPointerCapture(event.pointerId);
            this.addEventListener("pointermove", onPointerMove);
          }
        };
        const onPointerUp = () => this.removeEventListener("pointermove", onPointerMove);
        this.addEventListener("pointerdown", onPointerDown);
        this.addEventListener("pointerup", onPointerUp);
        this.addEventListener("pointercancel", onPointerUp);
      }
    }
  }
}
customElements.define("gesture-frame", GestureFrame);
export {
  GestureFrame
};
