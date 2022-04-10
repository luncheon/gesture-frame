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
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    connectedCallback(): void;
    setOffset(offsetX: number, offsetY: number): void;
    zoom(scaleRatio: number, originClientX: number, originClientY: number): void;
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
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    constructor();
}
export {};
