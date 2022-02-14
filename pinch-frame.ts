interface TouchPoint {
  readonly x: number;
  readonly y: number;
  readonly d: number;
}

class PinchFrame extends HTMLElement {
  constructor() {
    super();
    {
      let scaleRatio = 1;
      let clientX = 0;
      let clientY = 0;
      let animationHandle: number | undefined;
      this.addEventListener('wheel', (event) => {
        if (!event.ctrlKey) {
          return;
        }
        event.preventDefault();
        scaleRatio *= 0.98 ** event.deltaY;
        ({ clientX, clientY } = event);
        animationHandle ??
          (animationHandle = requestAnimationFrame(() => {
            animationHandle = undefined;
            this.#zoom(scaleRatio, clientX, clientY);
            scaleRatio = 1;
          }));
      });
    }
    {
      let previousPoint: TouchPoint = { x: NaN, y: NaN, d: 0 };
      let points: TouchPoint[] = [];
      let animationHandle: number | undefined;
      const calculatePoint = (event: TouchEvent): TouchPoint => {
        const touches = [...event.touches];
        return {
          x: touches.reduce((x, touch) => x + touch.clientX, 0) / touches.length,
          y: touches.reduce((y, touch) => y + touch.clientY, 0) / touches.length,
          d: touches.length > 1 ? Math.hypot(touches[0]!.clientX - touches[1]!.clientX, touches[0]!.clientY - touches[1]!.clientY) : 0,
        };
      };
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
          animationHandle ??
            (animationHandle = requestAnimationFrame(() => {
              animationHandle = undefined;
              const x = points.reduce((x, p) => x + p.x, 0) / points.length;
              const y = points.reduce((y, p) => y + p.y, 0) / points.length;
              const d = previousPoint.d && points.reduce((d, p) => d + p.d, 0) / points.length;
              d && this.#zoom(d / previousPoint.d, x, y);
              this.scrollLeft += previousPoint.x - x;
              this.scrollTop += previousPoint.y - y;
              points = [];
              previousPoint = { x, y, d };
            }));
        },
        { passive: false },
      );
    }
  }

  #zoom(scaleRatio: number, centerClientX: number, centerClientY: number) {
    if (scaleRatio === 1) {
      return;
    }
    const content = this.firstElementChild;
    if (!(content instanceof HTMLElement || content instanceof SVGElement)) {
      return;
    }
    const contentStyle = getComputedStyle(content);
    const matrix = new DOMMatrix(contentStyle.transform);
    const scale = Math.min(Math.max(matrix.a * scaleRatio, 0.1), 10);
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
    this.scrollLeft = left;
    content.style.paddingBottom = `${Math.max(0, frameClientRect.bottom - contentClientRect.bottom)}px`;
    content.style.marginTop = `${top}px`;
    this.scrollTop = top;
  }
}

customElements.define('pinch-frame', PinchFrame);
