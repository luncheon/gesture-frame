declare class ScrollableFrame extends HTMLElement {
    #private;
    static readonly observedAttributes: readonly string[];
    get scale(): number;
    set scale(scale: number);
    get minScale(): number;
    set minScale(minScale: number);
    get maxScale(): number;
    set maxScale(maxScale: number);
    get offsetX(): number;
    set offsetX(offsetX: number);
    get offsetY(): number;
    set offsetY(offsetY: number);
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    setOffset(offsetX: number, offsetY: number): void;
    _zoom(scaleRatio: number, originClientX: number, originClientY: number): void;
    /**
     * Zoom keeping the apparent position of `(origin.x, origin.y)`. Zoom in when `scaleRatio > 1` and zoom out when `scaleRatio < 1`. `origin.x` and `origin.y` can be specified as a `number` (px) or a `` `${number}%` ``. The default value for both is `"50%"` (center).
     */
    zoom(scaleRatio: number, origin?: {
        readonly x?: number | `${number}%`;
        readonly y?: number | `${number}%`;
    }): void;
    /**
     * Adjust the scale and offset to display the entire content.
     */
    fit(options?: {
        readonly marginX?: number;
        readonly marginY?: number;
    }): void;
    /**
     * Adjust the scale and offset-x to fit the width.
     */
    fitX(options?: {
        readonly margin?: number;
    }): void;
    /**
     * Adjust the scale and offset-y to fit the height.
     */
    fitY(options?: {
        readonly margin?: number;
    }): void;
}
export declare class GestureFrame extends ScrollableFrame {
    #private;
    static readonly observedAttributes: readonly string[];
    get panX(): boolean;
    set panX(panX: boolean);
    get panY(): boolean;
    set panY(panY: boolean);
    get panButton(): number;
    set panButton(panButton: number);
    get pinchZoom(): boolean;
    set pinchZoom(pinchZoom: boolean);
    get anchorLeft(): boolean;
    set anchorLeft(anchorLeft: boolean);
    get anchorRight(): boolean;
    set anchorRight(anchorRight: boolean);
    get anchorTop(): boolean;
    set anchorTop(anchorTop: boolean);
    get anchorBottom(): boolean;
    set anchorBottom(anchorBottom: boolean);
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    constructor();
}
export {};
