interface TouchPoint {
  readonly x: number;
  readonly y: number;
  readonly d: number;
}

const averageBy = <T>(items: ArrayLike<T>, selector: (item: T) => number) => {
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += selector(items[i]!);
  }
  return sum / items.length;
};

class PinchFrame extends HTMLElement {
  constructor() {
    super();
    if (typeof ontouchend === 'undefined') {
      let scaleRatio = 1;
      let clientX = 0;
      let clientY = 0;
      // @ts-ignore https://github.com/microsoft/TypeScript/issues/44802
      let animationHandle: number | undefined;
      this.addEventListener('wheel', (event) => {
        if (!event.ctrlKey) {
          return;
        }
        event.preventDefault();
        scaleRatio *= 0.98 ** event.deltaY;
        ({ clientX, clientY } = event);
        animationHandle ??= requestAnimationFrame(() => {
          animationHandle = undefined;
          this.#zoom(scaleRatio, clientX, clientY);
          scaleRatio = 1;
        });
      });
      this.addEventListener('pointerdown', (event) => (event.currentTarget as typeof this).setPointerCapture(event.pointerId));
      this.addEventListener('pointermove', (event) => {
        if (event.buttons === 1) {
          event.preventDefault();
          this.scrollBy(-event.movementX, -event.movementY);
        }
      });
    } else {
      let previousPoint: TouchPoint = { x: NaN, y: NaN, d: 0 };
      let points: TouchPoint[] = [];
      let animationHandle: number | undefined;
      const calculatePoint = ({ touches }: TouchEvent): TouchPoint => ({
        x: averageBy(touches, (touch) => touch.clientX),
        y: averageBy(touches, (touch) => touch.clientY),
        d: touches.length > 1 ? Math.hypot(touches[0]!.clientX - touches[1]!.clientX, touches[0]!.clientY - touches[1]!.clientY) : 0,
      });
      const onTouchStartEnd = (event: TouchEvent) => {
        if (animationHandle !== undefined) {
          cancelAnimationFrame(animationHandle);
          animationHandle = undefined;
        }
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
          animationHandle ??= requestAnimationFrame(() => {
            animationHandle = undefined;
            const x = averageBy(points, (p) => p.x);
            const y = averageBy(points, (p) => p.y);
            const d = previousPoint.d && averageBy(points, (p) => p.d);
            d && this.#zoom(d / previousPoint.d, x, y);
            this.scrollLeft += previousPoint.x - x;
            this.scrollTop += previousPoint.y - y;
            points = [];
            previousPoint = { x, y, d };
          });
        },
        { passive: false },
      );
    }
  }

  get minScale() {
    const value = +this.getAttribute('min-scale')!;
    return value > 0 ? value : 1;
  }

  get maxScale() {
    const value = +this.getAttribute('max-scale')!;
    return value > 0 ? value : 100;
  }

  #zoom(scaleRatio: number, centerClientX: number, centerClientY: number) {
    const content = this.firstElementChild;
    if (scaleRatio === 1 || !(content instanceof HTMLElement || content instanceof SVGElement)) {
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
    content.style.transform = matrix as DOMMatrix & string;
    content.style.margin = content.style.padding = 0 as number & string;

    const frameClientRect = this.getBoundingClientRect();
    const contentClientRect = content.getBoundingClientRect();
    const left = Math.max(0, Math.round(frameClientRect.x - contentClientRect.x));
    const top = Math.max(0, Math.round(frameClientRect.y - contentClientRect.y));
    content.style.paddingRight = `${Math.max(0, frameClientRect.right - contentClientRect.right)}px`;
    content.style.marginLeft = `${left}px`;
    content.style.paddingBottom = `${Math.max(0, frameClientRect.bottom - contentClientRect.bottom)}px`;
    content.style.marginTop = `${top}px`;
    this.scrollTo(left, top);
  }
}

customElements.define('pinch-frame', PinchFrame);
