"use strict";
const clamp = (x, min, max) => (x < min ? min : x > max ? max : x);
const clampZero = (x) => (x < 0 ? 0 : x);
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
    const wrappedCallback = () => ((handle = undefined), callback());
    return [
        () => (handle ??= requestAnimationFrame(wrappedCallback)),
        () => handle !== undefined && (cancelAnimationFrame(handle), (handle = undefined)),
    ];
};
class ScrollableFrame extends HTMLElement {
    static observedAttributes = ['scale', 'min-scale', 'max-scale', 'offset-x', 'offset-y'];
    #scale = 1;
    #reciprocalScale = 1;
    get scale() {
        return this.#scale;
    }
    set scale(scale) {
        if (this.#scale !== scale) {
            this.#setAttribute('scale', (this.#scale = scale = clamp(scale, this.#minScale, this.#maxScale)));
            this.#reciprocalScale = 1 / scale;
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
    #content;
    #disableScrollEventTemporarily;
    constructor() {
        super();
        (this.#content = this.attachShadow({ mode: 'open' }).appendChild(document.createElement('slot'))).setAttribute('part', 'content');
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
        this.setAttribute('scale', this.#scale);
        this.setAttribute('min-scale', this.#minScale);
        this.setAttribute('max-scale', this.#maxScale);
        setTimeout(() => {
            const rect = this.getBoundingClientRect();
            const contentRect = this.#content.getBoundingClientRect();
            this.setOffset((rect.width - contentRect.width) / 2, (rect.height - contentRect.height) / 2);
        });
    }
    #memoizedCTMString = '';
    #memoizedCTMs = [new DOMMatrixReadOnly(), new DOMMatrixReadOnly()];
    #getCTMs() {
        let ctmString = '';
        for (let element = this; element; element = element.parentElement) {
            const transform = getComputedStyle(element).transform;
            transform && transform !== 'none' && (ctmString += ` ${transform}`);
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
        this.#setAttribute('offset-x', (this.#offsetX = offsetX));
        this.#setAttribute('offset-y', (this.#offsetY = offsetY));
        const scale = this.#scale;
        const reciprocalScale = this.#reciprocalScale;
        const content = this.#content;
        const contentStyle = content.style;
        const [ctm, inverseCTM] = this.#getCTMs();
        const { x, y } = inverseCTM.transformPoint({ x: offsetX, y: offsetY });
        contentStyle.margin = `${(this.#marginY = clampZero(y))}px 0 0 ${(this.#marginX = clampZero(x))}px`;
        contentStyle.padding = '0';
        const paddingRight = x < 0 ? clampZero((this.clientWidth - content.clientWidth * scale) * ctm.a - x) * reciprocalScale * inverseCTM.a : 0;
        const paddingBottom = y < 0 ? clampZero((this.clientHeight - content.clientHeight * scale) * ctm.d - y) * reciprocalScale * inverseCTM.d : 0;
        contentStyle.padding = `0 ${paddingRight}px ${paddingBottom}px 0`;
        this.#disableScrollEventTemporarily();
        this.scrollTo(clampZero(-x), clampZero(-y));
    }
    zoom(scaleRatio, originClientX, originClientY) {
        const previousScale = this.#scale;
        const scale = clamp(previousScale * scaleRatio, this.#minScale, this.#maxScale);
        if (scale === previousScale) {
            return;
        }
        const offsetScale = scale * this.#reciprocalScale - 1;
        const contentRect = this.#content.getBoundingClientRect();
        this.scale = scale;
        this.setOffset(this.#offsetX + offsetScale * (contentRect.x - originClientX), this.#offsetY + offsetScale * (contentRect.y - originClientY));
    }
}
class PinchFrame extends ScrollableFrame {
    constructor() {
        super();
        if (typeof ontouchend === 'undefined') {
            {
                let scaleRatio = 1;
                let clientX;
                let clientY;
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
                let previousClientX;
                let previousClientY;
                let clientX;
                let clientY;
                const [reservePanning] = throttle(() => {
                    // do not use movementX/Y, that do not aware page zoom
                    this.setOffset(this.offsetX + clientX - previousClientX, this.offsetY + clientY - previousClientY);
                    previousClientX = clientX;
                    previousClientY = clientY;
                });
                this.addEventListener('pointerdown', (event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
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
        }
        else {
            let previousPoint = { x: 0, y: 0, d: 0 };
            let points = [];
            const [reservePanZoom, cancelPanZoom] = throttle(() => {
                const x = averageBy(points, (p) => p.x);
                const y = averageBy(points, (p) => p.y);
                const d = previousPoint.d && averageBy(points, (p) => p.d);
                d && this.zoom(d / previousPoint.d, x, y);
                this.setOffset(this.offsetX + x - previousPoint.x, this.offsetY + y - previousPoint.y);
                points = [];
                previousPoint = { x, y, d };
            });
            const calculatePoint = ({ touches }) => ({
                x: averageBy(touches, (touch) => touch.clientX),
                y: averageBy(touches, (touch) => touch.clientY),
                d: touches.length > 1 ? Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY) : 0,
            });
            const onTouchStartEnd = (event) => {
                cancelPanZoom();
                points = [];
                event.touches.length !== 0 && (previousPoint = calculatePoint(event));
            };
            this.addEventListener('touchstart', onTouchStartEnd);
            this.addEventListener('touchend', onTouchStartEnd);
            this.addEventListener('touchmove', (event) => {
                event.preventDefault();
                points.push(calculatePoint(event));
                reservePanZoom();
            }, { passive: false });
        }
    }
}
customElements.define('pinch-frame', PinchFrame);
