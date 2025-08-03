// Type definitions for coherent-framework
// Project: Coherent.js - Pure object-based rendering framework

export interface CoherentElement {
  [tagName: string]: {
    text?: string;
    html?: string;
    children?: CoherentNode[];
    className?: string | (() => string);
    [key: string]: any;
  };
}

export type CoherentNode = CoherentElement | string | number | boolean | null | undefined;

export interface ComponentFunction {
  (props?: Record<string, any>): CoherentNode;
}

export interface RenderOptions {
  minify?: boolean;
  stream?: boolean;
}

export function renderToString(node: CoherentNode, options?: RenderOptions): string;

export function renderToStream(node: CoherentNode, options?: RenderOptions): ReadableStream;

export function createElement(tagName: string, props?: Record<string, any>, ...children: CoherentNode[]): CoherentElement;

export function memo(component: ComponentFunction, areEqual?: (prevProps: any, nextProps: any) => boolean): ComponentFunction;

export function compose(...hocs: Array<(component: ComponentFunction) => ComponentFunction>): (component: ComponentFunction) => ComponentFunction;

// Context API
export function provideContext<T>(key: string, value: T): void;
export function restoreContext<T>(key: string): T | undefined;
export function clearAllContexts(): void;
export function createContextProvider<T>(key: string, value: T): ComponentFunction;
export function useContext<T>(key: string): T | undefined;

// State Management
export interface StateManager {
  createState<T>(initialState: T): {
    state: T;
    setState: (newState: Partial<T>) => void;
    destroy: () => void;
  };
  globalState: Map<string, any>;
}

export const stateManager: StateManager;

// Performance Monitoring
export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
}

export function startPerformanceMonitor(): void;
export function getPerformanceMetrics(): PerformanceMetrics;
export function resetPerformanceMetrics(): void;
