/**
 * TypeScript type definitions for Coherent.js Event Bus System
 */

// Event data types
export type EventData = any;
export type EventListener<T = EventData> = (data: T, event: string) => void | Promise<void>;
export type EventMiddleware = (event: string, data: EventData, next: () => void | Promise<void>) => void | Promise<void>;

// Action context types
export interface ActionContext {
  element: HTMLElement;
  event: Event;
  data: Record<string, any>;
  state: any;
  setState: (newState: any) => void;
  emit: (event: string, data?: EventData) => Promise<void>;
  emitSync: (event: string, data?: EventData) => void;
}

export type ActionHandler = (context: ActionContext) => void | Promise<void>;

// Event bus configuration
export interface EventBusOptions {
  debug?: boolean;
  performance?: boolean;
  maxListeners?: number;
  enableWildcards?: boolean;
  enableAsync?: boolean;
}

// Statistics
export interface EventBusStats {
  eventsEmitted: number;
  listenersExecuted: number;
  errorsOccurred: number;
  averageEmitTime: number;
}

// Event map for type safety
export interface EventMap {
  // DOM events
  'dom:click': { element: HTMLElement; event: Event; action?: string; data: Record<string, any> };
  'dom:change': { element: HTMLElement; event: Event; value: any; action?: string; data: Record<string, any> };
  'dom:input': { element: HTMLElement; event: Event; value: any; action?: string; data: Record<string, any> };
  'dom:submit': { element: HTMLElement; event: Event; action?: string; formData: Record<string, any>; data: Record<string, any> };
  'dom:keydown': { element: HTMLElement; event: KeyboardEvent; key: string; code: string; action?: string; keyAction?: string; data: Record<string, any> };
  'dom:focus': { element: HTMLElement; event: Event; data: Record<string, any> };
  'dom:blur': { element: HTMLElement; event: Event; data: Record<string, any> };
  'dom:action': { action: string; element: HTMLElement; event: Event; data: Record<string, any> };

  // Notification events
  'notification:show': { type?: 'success' | 'error' | 'warning' | 'info'; message: string; duration?: number };
  'notification:success': { message: string; duration?: number };
  'notification:error': { message: string; duration?: number };
  'notification:warning': { message: string; duration?: number };
  'notification:info': { message: string; duration?: number };

  // Modal events
  'modal:open': { modalId: string };
  'modal:close': { modalId: string };
  'modal:toggle': { modalId: string };

  // Form events
  'form:submit': { formData: Record<string, any>; element: HTMLElement };
  'form:reset': { element: HTMLElement };
  'form:validation': { formData: Record<string, any>; isValid: boolean };
  'form:validation-failed': { formData: Record<string, any> };

  // Loading events
  'loading:start': { context?: string };
  'loading:stop': { context?: string };
  'loading:toggle': { context?: string };

  // Navigation events
  'navigation:change': { url: string; replace: boolean };
  'navigation:back': {};

  // Error events
  'eventbus:error': { error: Error; event: string; data: EventData };

  // Generic CRUD events
  'create': { entity: string; data: any };
  'update': { entity: string; id: any; data: any };
  'delete': { entity: string; id: any };
  'read': { entity: string; id?: any; filters?: any };

  // Add custom events as needed
  [key: string]: any;
}

// Event bus interface
export interface IEventBus {
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): Promise<void>;
  emit(event: string, data?: EventData): Promise<void>;

  emitSync<K extends keyof EventMap>(event: K, data: EventMap[K]): void;
  emitSync(event: string, data?: EventData): void;

  on<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): string;
  on(event: string, listener: EventListener): string;

  once<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): string;
  once(event: string, listener: EventListener): string;

  off(event: string, listenerId: string): boolean;
  removeAllListeners(event?: string): void;

  registerAction(action: string, handler: ActionHandler): void;
  registerActions(actions: Record<string, ActionHandler>): void;
  handleAction(action: string, element: HTMLElement, event: Event, data?: Record<string, any>): void;

  use(middleware: EventMiddleware): IEventBus;
  createScope(scope: string): IScopedEventBus;

  getStats(): EventBusStats;
  resetStats(): void;
  destroy(): void;
}

// Scoped event bus interface
export interface IScopedEventBus {
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): Promise<void>;
  emit(event: string, data?: EventData): Promise<void>;

  emitSync<K extends keyof EventMap>(event: K, data: EventMap[K]): void;
  emitSync(event: string, data?: EventData): void;

  on<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): string;
  on(event: string, listener: EventListener): string;

  once<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): string;
  once(event: string, listener: EventListener): string;

  off(event: string, listenerId: string): boolean;

  registerAction(action: string, handler: ActionHandler): void;
  handleAction(action: string, element: HTMLElement, event: Event, data?: Record<string, any>): void;
}

// DOM integration types
export interface DOMIntegrationOptions {
  debug?: boolean;
  debounceDelay?: number;
  throttleDelay?: number;
  enableDelegation?: boolean;
  enableDebounce?: boolean;
  enableThrottle?: boolean;
}

export interface IDOMIntegration {
  initialize(rootElement?: HTMLElement): void;
  addCustomListener(eventType: string, handler: Function, options?: AddEventListenerOptions): void;
  removeCustomListener(eventType: string): void;
  registerActions(actions: Record<string, ActionHandler>): void;
  getActiveElement(): HTMLElement | null;
  triggerAction(action: string, element: HTMLElement, data?: Record<string, any>): void;
  destroy(): void;
}

// Component integration types
export interface ComponentContext {
  props: any;
  state: any;
  context: any;
}

export interface EventBusComponentOptions {
  scope?: string;
  events?: Record<string, EventListener>;
  actions?: Record<string, ActionHandler>;
  eventBus?: IEventBus;
  debug?: boolean;
  autoCleanup?: boolean;
}

export interface EventStateOptions extends EventBusComponentOptions {
  stateActions?: Record<string, Function>;
}

export interface EventUtils {
  emit: IEventBus['emit'];
  emitSync: IEventBus['emitSync'];
  on: IEventBus['on'];
  once: IEventBus['once'];
  off: IEventBus['off'];
  registerAction: IEventBus['registerAction'];
  handleAction: IEventBus['handleAction'];
  cleanup: () => void;
}

export interface EnhancedComponentProps {
  eventBus: IEventBus | IScopedEventBus;
  eventUtils: EventUtils;
}

// HOC types
export type EventBusHOC = <P extends {}>(component: (props: P & EnhancedComponentProps) => any) =>
  (props: P) => any;

export type EventStateHOC = <P extends {}>(component: (props: P & EnhancedComponentProps) => any) =>
  (props: P) => any;

// Pattern types
export interface ModalPatternOptions {
  modalId?: string;
}

export interface FormPatternOptions {
  onSubmit?: (formData: Record<string, any>) => void;
  onValidate?: (formData: Record<string, any>) => boolean;
  onReset?: () => void;
}

export interface CrudPatternOptions {
  entityName?: string;
  onCreate?: (data: any) => void;
  onUpdate?: (data: any) => void;
  onDelete?: (data: any) => void;
  onRead?: (data: any) => void;
}

export interface NavigationPatternOptions {
  onNavigate?: (url: string, replace: boolean) => void;
  history?: {
    push: (url: string) => void;
    replace: (url: string) => void;
    goBack: () => void;
  };
}

export interface EventComponentOptions {
  initialState?: any;
  scope?: string;
  patterns?: Array<'modal' | 'form' | 'crud' | 'navigation'>;
  patternOptions?: {
    modal?: ModalPatternOptions;
    form?: FormPatternOptions;
    crud?: CrudPatternOptions;
    navigation?: NavigationPatternOptions;
  };
  customActions?: Record<string, ActionHandler>;
  customEvents?: Record<string, EventListener>;
  debug?: boolean;
}

// Action handler creators
export interface ActionHandlerCreators {
  modal: (modalId: string) => Record<string, ActionHandler>;
  form: (options?: FormPatternOptions) => Record<string, ActionHandler>;
  crud: (options?: CrudPatternOptions) => Record<string, ActionHandler>;
  navigation: (options?: NavigationPatternOptions) => Record<string, ActionHandler>;
}

// Event handler creators
export interface EventHandlerCreators {
  notifications: (showNotification: (data: any) => void) => Record<string, EventListener>;
  loading: (setLoading: (state: boolean | ((current: boolean) => boolean), data?: any) => void) => Record<string, EventListener>;
}

// Main exports
export declare const EventBus: new (options?: EventBusOptions) => IEventBus;
export declare const createEventBus: (options?: EventBusOptions) => IEventBus;
export declare const globalEventBus: IEventBus;

export declare const emit: IEventBus['emit'];
export declare const emitSync: IEventBus['emitSync'];
export declare const on: IEventBus['on'];
export declare const once: IEventBus['once'];
export declare const off: IEventBus['off'];
export declare const registerAction: IEventBus['registerAction'];
export declare const handleAction: IEventBus['handleAction'];

export declare const DOMEventIntegration: new (eventBus?: IEventBus, options?: DOMIntegrationOptions) => IDOMIntegration;
export declare const globalDOMIntegration: IDOMIntegration;
export declare const initializeDOMIntegration: (options?: DOMIntegrationOptions) => IDOMIntegration;

export declare const withEventBus: (options?: EventBusComponentOptions) => EventBusHOC;
export declare const withEventState: (initialState?: any, options?: EventStateOptions) => EventStateHOC;
export declare const createActionHandlers: ActionHandlerCreators;
export declare const createEventHandlers: EventHandlerCreators;
export declare const createEventComponent: (component: Function, options?: EventComponentOptions) => Function;
export declare const emitEvent: (eventName: string, options?: { scope?: string; data?: any; async?: boolean }) => Function;

export interface EventSystem {
  bus: IEventBus;
  dom: IDOMIntegration;
  emit: IEventBus['emit'];
  emitSync: IEventBus['emitSync'];
  on: IEventBus['on'];
  once: IEventBus['once'];
  off: IEventBus['off'];
  registerAction: IEventBus['registerAction'];
  registerActions: IEventBus['registerActions'];
  handleAction: IEventBus['handleAction'];
  createScope: IEventBus['createScope'];
  getStats: IEventBus['getStats'];
  resetStats: IEventBus['resetStats'];
  destroy: () => void;
}

declare const eventSystem: EventSystem;
export default eventSystem;