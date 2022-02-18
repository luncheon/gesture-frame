"use strict";
const sumBy = (items, selector) => {
    let sum = 0;
    for (let i = 0; i < items.length; i++) {
        sum += selector(items[i]);
    }
    return sum;
};
const averageBy = (items, selector) => items.length === 1 ? selector(items[0]) : sumBy(items, selector) / items.length;
const roundToNatural = (value) => (value <= 0 ? 0 : Math.round(value));
const debounced = (callback) => {
    let handle;
    const wrappedCallback = () => ((handle = undefined), callback());
    return [
        () => (handle ??= requestAnimationFrame(wrappedCallback)),
        () => handle !== undefined && (cancelAnimationFrame(handle), (handle = undefined)),
    ];
};
class PinchFrame extends HTMLElement {
    constructor() {
        super();
        if (typeof ontouchend === 'undefined') {
            {
                let scaleRatio = 1;
                let clientX;
                let clientY;
                const [reserveZooming] = debounced(() => {
                    this.#zoom(scaleRatio, clientX, clientY);
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
                const [reservePanning] = debounced(() => {
                    // do not use movementX/Y, that do not aware page zoom
                    this.scrollBy(previousClientX - clientX, previousClientY - clientY);
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
            const [reservePanZoom, cancelPanZoom] = debounced(() => {
                const x = averageBy(points, (p) => p.x);
                const y = averageBy(points, (p) => p.y);
                const d = previousPoint.d && averageBy(points, (p) => p.d);
                d && this.#zoom(d / previousPoint.d, x, y);
                this.scrollBy(previousPoint.x - x, previousPoint.y - y);
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
    get minScale() {
        const value = +this.getAttribute('min-scale');
        return value > 0 ? value : 1;
    }
    get maxScale() {
        const value = +this.getAttribute('max-scale');
        return value > 0 ? value : 100;
    }
    #zoom(scaleRatio, centerClientX, centerClientY) {
        const content = this.firstElementChild;
        if (scaleRatio === 1 || !content) {
            return;
        }
        const contentStyle = getComputedStyle(content);
        const matrix = new DOMMatrix(contentStyle.transform);
        const scale = Math.min(Math.max(matrix.a * scaleRatio, this.minScale), this.maxScale);
        if (scale === matrix.a) {
            return;
        }
        const previousContentClientRect = content.getBoundingClientRect();
        const offsetScale = scale / matrix.a - 1;
        matrix.a = matrix.d = scale;
        matrix.e -= offsetScale * (centerClientX - previousContentClientRect.x) + this.scrollLeft - parseFloat(contentStyle.marginLeft);
        matrix.f -= offsetScale * (centerClientY - previousContentClientRect.y) + this.scrollTop - parseFloat(contentStyle.marginTop);
        content.style.transform = matrix;
        content.style.margin = content.style.padding = 0;
        const frameClientRect = this.getBoundingClientRect();
        const contentClientRect = content.getBoundingClientRect();
        const left = roundToNatural(-matrix.e) || roundToNatural(frameClientRect.x - contentClientRect.x);
        const top = roundToNatural(-matrix.f) || roundToNatural(frameClientRect.y - contentClientRect.y);
        left && (content.style.paddingRight = `${roundToNatural(frameClientRect.right - contentClientRect.right)}px`);
        content.style.marginLeft = `${left}px`;
        top && (content.style.paddingBottom = `${roundToNatural(frameClientRect.bottom - contentClientRect.bottom)}px`);
        content.style.marginTop = `${top}px`;
        this.scrollTo(left, top);
    }
}
customElements.define('pinch-frame', PinchFrame);
