import { Observable } from "rxjs";
interface SpaceBehindWindow {
    width: number;
    height: number;
}
export declare function computeSpaceBehindWindowOf(el: Element): SpaceBehindWindow;
interface GridMeasurement {
    colGap: number;
    rowGap: number;
    flow: "row" | "column";
    columns: number;
    rows: number;
}
export declare function getGridMeasurement(rootEl: Element): GridMeasurement;
interface ResizeMeasurement extends GridMeasurement {
    itemHeightWithGap: number;
    itemWidthWithGap: number;
}
export declare function getResizeMeasurement(rootEl: Element, { height, width }: DOMRectReadOnly): ResizeMeasurement;
interface BufferMeta {
    bufferedOffset: number;
    bufferedLength: number;
}
export declare const getBufferMeta: (windowInnerWidth?: number, windowInnerHeight?: number) => ({ width: widthBehindWindow, height: heightBehindWindow }: SpaceBehindWindow, { colGap, rowGap, flow, columns, rows, itemHeightWithGap, itemWidthWithGap, }: ResizeMeasurement) => BufferMeta;
export declare function getObservableOfVisiblePageNumbers({ bufferedOffset, bufferedLength }: BufferMeta, length: number, pageSize: number): Observable<number>;
interface ItemsByPage {
    pageNumber: number;
    items: unknown[];
}
export type PageProvider = (pageNumber: number, pageSize: number) => Promise<unknown[]>;
export declare function callPageProvider(pageNumber: number, pageSize: number, pageProvider: PageProvider): Promise<ItemsByPage>;
export declare function accumulateAllItems(allItems: unknown[], [{ pageNumber, items }, length, pageSize]: [ItemsByPage, number, number]): unknown[];
interface ItemOffset {
    x: number;
    y: number;
}
export declare function getItemOffsetByIndex(index: number, { flow, columns, rows, itemWidthWithGap, itemHeightWithGap, }: ResizeMeasurement): ItemOffset;
export interface InternalItem {
    index: number;
    value: unknown | undefined;
    style?: {
        transform: string;
        gridArea: string;
    };
}
export declare function getVisibleItems({ bufferedOffset, bufferedLength }: BufferMeta, resizeMeasurement: ResizeMeasurement, allItems: unknown[]): InternalItem[];
export declare function accumulateBuffer(buffer: InternalItem[], visibleItems: InternalItem[]): InternalItem[];
interface ContentSize {
    width?: number;
    height?: number;
}
export declare function getContentSize({ colGap, rowGap, flow, columns, rows, itemWidthWithGap, itemHeightWithGap, }: ResizeMeasurement, length: number): ContentSize;
interface PipelineInput {
    length$: Observable<number>;
    pageProvider$: Observable<PageProvider>;
    pageProviderDebounceTime$: Observable<number>;
    pageSize$: Observable<number>;
    itemRect$: Observable<DOMRectReadOnly>;
    rootResize$: Observable<Element>;
    scroll$: Observable<Element>;
    respectScrollToOnResize$: Observable<boolean>;
    scrollTo$: Observable<number | undefined>;
}
export type ScrollAction = {
    target: Element;
    top: number;
    left: number;
};
interface PipelineOutput {
    buffer$: Observable<InternalItem[]>;
    contentSize$: Observable<ContentSize>;
    scrollAction$: Observable<ScrollAction>;
    allItems$: Observable<unknown[]>;
}
export declare function pipeline({ length$, pageProvider$, pageProviderDebounceTime$, pageSize$, itemRect$, rootResize$, scroll$, respectScrollToOnResize$, scrollTo$, }: PipelineInput): PipelineOutput;
export {};
