import { Observable } from "rxjs";
import { Ref } from "vue";
import { MaybeElementRef, ResizeObserverEntry } from "@vueuse/core";
export declare function fromProp<T, U extends keyof T>(props: T, propName: U): Observable<T[U]>;
export declare function fromResizeObserver<T extends keyof ResizeObserverEntry>(elRef: MaybeElementRef, pluckTarget: T): Observable<ResizeObserverEntry[T]>;
export declare function fromScrollParent(elRef: MaybeElementRef): Observable<Element>;
export declare function useObservable<H>(observable: Observable<H>): Readonly<Ref<H>>;
interface ScrollParents {
    vertical: Element;
    horizontal: Element;
}
export declare function getScrollParents(element: Element, includeHidden?: boolean): ScrollParents;
export {};
