import { PropType, StyleValue } from "vue";
import { InternalItem, PageProvider } from "./pipeline";
import { VueInstance } from "@vueuse/core";
declare const _default: import("vue").DefineComponent<{
    length: {
        type: PropType<number>;
        required: true;
        validator: (value: number) => boolean;
    };
    pageProvider: {
        type: PropType<PageProvider>;
        required: true;
    };
    pageProviderDebounceTime: {
        type: PropType<number>;
        required: false;
        default: number;
        validator: (value: number) => boolean;
    };
    pageSize: {
        type: PropType<number>;
        required: true;
        validator: (value: number) => boolean;
    };
    scrollTo: {
        type: PropType<number>;
        required: false;
        validator: (value: number) => boolean;
    };
    respectScrollToOnResize: {
        type: PropType<boolean>;
        required: false;
        default: boolean;
    };
    scrollBehavior: {
        type: PropType<"smooth" | "auto">;
        required: false;
        default: string;
        validator: (value: string) => boolean;
    };
    tag: {
        type: PropType<string>;
        required: false;
        default: string;
    };
    probeTag: {
        type: PropType<string>;
        required: false;
        default: string;
    };
    getKey: {
        type: PropType<(internalItem: InternalItem) => number | string>;
        required: false;
        default: undefined;
    };
}, {
    rootRef: import("vue").Ref<HTMLElement | SVGElement | VueInstance | undefined>;
    probeRef: import("vue").Ref<HTMLElement | SVGElement | VueInstance | undefined>;
    buffer: Readonly<import("vue").Ref<InternalItem[]>>;
    rootStyles: import("vue").ComputedRef<StyleValue>;
    keyPrefix: import("vue").Ref<string>;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    length: {
        type: PropType<number>;
        required: true;
        validator: (value: number) => boolean;
    };
    pageProvider: {
        type: PropType<PageProvider>;
        required: true;
    };
    pageProviderDebounceTime: {
        type: PropType<number>;
        required: false;
        default: number;
        validator: (value: number) => boolean;
    };
    pageSize: {
        type: PropType<number>;
        required: true;
        validator: (value: number) => boolean;
    };
    scrollTo: {
        type: PropType<number>;
        required: false;
        validator: (value: number) => boolean;
    };
    respectScrollToOnResize: {
        type: PropType<boolean>;
        required: false;
        default: boolean;
    };
    scrollBehavior: {
        type: PropType<"smooth" | "auto">;
        required: false;
        default: string;
        validator: (value: string) => boolean;
    };
    tag: {
        type: PropType<string>;
        required: false;
        default: string;
    };
    probeTag: {
        type: PropType<string>;
        required: false;
        default: string;
    };
    getKey: {
        type: PropType<(internalItem: InternalItem) => number | string>;
        required: false;
        default: undefined;
    };
}>>, {
    pageProviderDebounceTime: number;
    respectScrollToOnResize: boolean;
    scrollBehavior: "smooth" | "auto";
    tag: string;
    probeTag: string;
    getKey: (internalItem: InternalItem) => number | string;
}, {}>;
export default _default;
