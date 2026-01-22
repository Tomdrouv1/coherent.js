/**
 * Coherent.js Strict Element Types
 * Per-element attribute validation for HTML elements
 *
 * This module provides strict TypeScript types for HTML elements with:
 * - Per-element attribute validation (e.g., 'checked' only on input)
 * - Strict children types (no boolean children)
 * - Void element handling (no children on img, input, br, etc.)
 * - Data attribute support via template literal types
 *
 * @version 1.0.0-beta.1
 */

// ============================================================================
// Strict Children Type
// ============================================================================

/**
 * Valid child types for Coherent elements.
 * Note: boolean is NOT allowed - use null/undefined for conditional rendering.
 */
export type CoherentChild =
  | string
  | number
  | StrictCoherentElement
  | StrictCoherentElement[]
  | null
  | undefined;

// ============================================================================
// Global HTML Attributes
// ============================================================================

/**
 * ARIA role values for accessibility
 */
export type AriaRole =
  | 'alert'
  | 'alertdialog'
  | 'application'
  | 'article'
  | 'banner'
  | 'button'
  | 'cell'
  | 'checkbox'
  | 'columnheader'
  | 'combobox'
  | 'complementary'
  | 'contentinfo'
  | 'definition'
  | 'dialog'
  | 'directory'
  | 'document'
  | 'feed'
  | 'figure'
  | 'form'
  | 'grid'
  | 'gridcell'
  | 'group'
  | 'heading'
  | 'img'
  | 'link'
  | 'list'
  | 'listbox'
  | 'listitem'
  | 'log'
  | 'main'
  | 'marquee'
  | 'math'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'navigation'
  | 'none'
  | 'note'
  | 'option'
  | 'presentation'
  | 'progressbar'
  | 'radio'
  | 'radiogroup'
  | 'region'
  | 'row'
  | 'rowgroup'
  | 'rowheader'
  | 'scrollbar'
  | 'search'
  | 'searchbox'
  | 'separator'
  | 'slider'
  | 'spinbutton'
  | 'status'
  | 'switch'
  | 'tab'
  | 'table'
  | 'tablist'
  | 'tabpanel'
  | 'term'
  | 'textbox'
  | 'timer'
  | 'toolbar'
  | 'tooltip'
  | 'tree'
  | 'treegrid'
  | 'treeitem'
  | string; // Allow custom roles

/**
 * Global HTML attributes shared by all elements.
 * Based on lib.dom.d.ts patterns.
 */
export interface GlobalHTMLAttributes {
  // Core attributes
  id?: string;
  className?: string;
  class?: string; // alias for className
  style?: string | Record<string, string | number>;
  title?: string;
  lang?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
  tabIndex?: number;
  hidden?: boolean;
  draggable?: boolean | 'true' | 'false';
  contentEditable?: boolean | 'true' | 'false' | 'inherit';
  spellCheck?: boolean | 'true' | 'false';
  translate?: 'yes' | 'no';
  accessKey?: string;
  autoCapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  slot?: string;
  is?: string;

  // Key prop for reconciliation (extracted, not rendered)
  key?: string | number;

  // Data attributes (template literal type)
  [key: `data-${string}`]: string | number | boolean | undefined;

  // ARIA attributes
  role?: AriaRole;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-disabled'?: boolean | 'true' | 'false';
  'aria-expanded'?: boolean | 'true' | 'false';
  'aria-selected'?: boolean | 'true' | 'false';
  'aria-checked'?: boolean | 'true' | 'false' | 'mixed';
  'aria-pressed'?: boolean | 'true' | 'false' | 'mixed';
  'aria-current'?: boolean | 'true' | 'false' | 'page' | 'step' | 'location' | 'date' | 'time';
  'aria-live'?: 'off' | 'assertive' | 'polite';
  'aria-atomic'?: boolean | 'true' | 'false';
  'aria-busy'?: boolean | 'true' | 'false';
  'aria-controls'?: string;
  'aria-haspopup'?: boolean | 'true' | 'false' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
  'aria-modal'?: boolean | 'true' | 'false';
  'aria-multiline'?: boolean | 'true' | 'false';
  'aria-multiselectable'?: boolean | 'true' | 'false';
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-owns'?: string;
  'aria-placeholder'?: string;
  'aria-readonly'?: boolean | 'true' | 'false';
  'aria-required'?: boolean | 'true' | 'false';
  'aria-roledescription'?: string;
  'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other';
  'aria-valuemax'?: number;
  'aria-valuemin'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
}

// ============================================================================
// Global Event Handlers
// ============================================================================

/**
 * Event handler types matching runtime behavior.
 * Handlers can be either inline strings (for SSR) or functions (for hydration).
 */
export interface GlobalEventHandlers {
  // Mouse events
  onClick?: string | ((event: MouseEvent) => void);
  onDblClick?: string | ((event: MouseEvent) => void);
  onMouseDown?: string | ((event: MouseEvent) => void);
  onMouseUp?: string | ((event: MouseEvent) => void);
  onMouseEnter?: string | ((event: MouseEvent) => void);
  onMouseLeave?: string | ((event: MouseEvent) => void);
  onMouseMove?: string | ((event: MouseEvent) => void);
  onMouseOver?: string | ((event: MouseEvent) => void);
  onMouseOut?: string | ((event: MouseEvent) => void);
  onContextMenu?: string | ((event: MouseEvent) => void);

  // Keyboard events
  onKeyDown?: string | ((event: KeyboardEvent) => void);
  onKeyUp?: string | ((event: KeyboardEvent) => void);
  onKeyPress?: string | ((event: KeyboardEvent) => void);

  // Focus events
  onFocus?: string | ((event: FocusEvent) => void);
  onBlur?: string | ((event: FocusEvent) => void);
  onFocusIn?: string | ((event: FocusEvent) => void);
  onFocusOut?: string | ((event: FocusEvent) => void);

  // Form events
  onChange?: string | ((event: Event) => void);
  onInput?: string | ((event: Event) => void);
  onSubmit?: string | ((event: SubmitEvent) => void);
  onReset?: string | ((event: Event) => void);
  onInvalid?: string | ((event: Event) => void);

  // Drag events
  onDrag?: string | ((event: DragEvent) => void);
  onDragEnd?: string | ((event: DragEvent) => void);
  onDragEnter?: string | ((event: DragEvent) => void);
  onDragLeave?: string | ((event: DragEvent) => void);
  onDragOver?: string | ((event: DragEvent) => void);
  onDragStart?: string | ((event: DragEvent) => void);
  onDrop?: string | ((event: DragEvent) => void);

  // Clipboard events
  onCopy?: string | ((event: ClipboardEvent) => void);
  onCut?: string | ((event: ClipboardEvent) => void);
  onPaste?: string | ((event: ClipboardEvent) => void);

  // Touch events
  onTouchStart?: string | ((event: TouchEvent) => void);
  onTouchMove?: string | ((event: TouchEvent) => void);
  onTouchEnd?: string | ((event: TouchEvent) => void);
  onTouchCancel?: string | ((event: TouchEvent) => void);

  // Wheel events
  onWheel?: string | ((event: WheelEvent) => void);
  onScroll?: string | ((event: Event) => void);

  // Animation events
  onAnimationStart?: string | ((event: AnimationEvent) => void);
  onAnimationEnd?: string | ((event: AnimationEvent) => void);
  onAnimationIteration?: string | ((event: AnimationEvent) => void);

  // Transition events
  onTransitionStart?: string | ((event: TransitionEvent) => void);
  onTransitionEnd?: string | ((event: TransitionEvent) => void);
  onTransitionCancel?: string | ((event: TransitionEvent) => void);
  onTransitionRun?: string | ((event: TransitionEvent) => void);
}

// ============================================================================
// Coherent-specific Properties
// ============================================================================

/**
 * Coherent.js-specific element properties.
 */
export interface CoherentElementBase {
  /** Text content (escaped during render) */
  text?: string | number;
  /** Raw HTML content (dangerous - not escaped) */
  html?: string;
  /** Child elements */
  children?: CoherentChild | CoherentChild[];
}

/**
 * Base attributes combining global HTML attributes, event handlers, and Coherent properties.
 */
export type BaseElementAttributes = GlobalHTMLAttributes & GlobalEventHandlers & CoherentElementBase;

// ============================================================================
// Element-specific Attribute Interfaces
// ============================================================================

/**
 * Input element types
 */
export type InputType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'search'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'month'
  | 'week'
  | 'color'
  | 'file'
  | 'hidden'
  | 'checkbox'
  | 'radio'
  | 'range'
  | 'submit'
  | 'reset'
  | 'button'
  | 'image';

/**
 * Input element attributes
 */
export interface InputAttributes extends GlobalHTMLAttributes, GlobalEventHandlers {
  // Coherent-specific (no children for void element, only text for label)
  text?: string | number;
  html?: string;
  // Note: children intentionally omitted for void element

  // Input-specific attributes
  type?: InputType;
  value?: string | number | readonly string[];
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  name?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  pattern?: string;
  readOnly?: boolean;
  readonly?: boolean; // alias
  autoComplete?: string;
  autocomplete?: string; // alias
  autoFocus?: boolean;
  autofocus?: boolean; // alias
  multiple?: boolean;
  accept?: string;
  maxLength?: number;
  minLength?: number;
  size?: number;
  list?: string;
  form?: string;
  formAction?: string;
  formEncType?: string;
  formMethod?: string;
  formNoValidate?: boolean;
  formTarget?: string;
  capture?: boolean | 'user' | 'environment';
  width?: number | string;
  height?: number | string;
  src?: string;
  alt?: string;
}

/**
 * Button element attributes
 */
export interface ButtonAttributes extends BaseElementAttributes {
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  form?: string;
  formAction?: string;
  formEncType?: string;
  formMethod?: string;
  formTarget?: string;
  formNoValidate?: boolean;
  name?: string;
  value?: string;
  popoverTarget?: string;
  popoverTargetAction?: 'hide' | 'show' | 'toggle';
}

/**
 * Anchor element attributes
 */
export interface AnchorAttributes extends BaseElementAttributes {
  href?: string;
  target?: '_self' | '_blank' | '_parent' | '_top' | string;
  rel?: string;
  download?: string | boolean;
  hrefLang?: string;
  hreflang?: string; // alias
  type?: string;
  referrerPolicy?: ReferrerPolicy;
  ping?: string;
}

/**
 * Image element attributes (void element - no children)
 */
export interface ImgAttributes extends GlobalHTMLAttributes, GlobalEventHandlers {
  // Coherent-specific (no children for void element)
  text?: string | number;
  html?: string;
  // Note: children intentionally omitted for void element

  src?: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  loading?: 'lazy' | 'eager';
  decoding?: 'sync' | 'async' | 'auto';
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
  referrerPolicy?: ReferrerPolicy;
  srcSet?: string;
  srcset?: string; // alias
  sizes?: string;
  useMap?: string;
  isMap?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';

  // Event handlers
  onLoad?: string | ((event: Event) => void);
  onError?: string | ((event: Event) => void);
}

/**
 * Form element attributes
 */
export interface FormAttributes extends BaseElementAttributes {
  action?: string;
  method?: 'get' | 'post' | 'dialog';
  encType?: string;
  enctype?: string; // alias
  target?: '_self' | '_blank' | '_parent' | '_top' | string;
  noValidate?: boolean;
  novalidate?: boolean; // alias
  autoComplete?: 'on' | 'off';
  autocomplete?: 'on' | 'off'; // alias
  acceptCharset?: string;
  name?: string;
  rel?: string;
}

/**
 * Select element attributes
 */
export interface SelectAttributes extends BaseElementAttributes {
  name?: string;
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
  size?: number;
  autoFocus?: boolean;
  autofocus?: boolean; // alias
  form?: string;
  value?: string | number | readonly string[];
}

/**
 * Textarea element attributes
 */
export interface TextareaAttributes extends BaseElementAttributes {
  name?: string;
  rows?: number;
  cols?: number;
  disabled?: boolean;
  readOnly?: boolean;
  readonly?: boolean; // alias
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  wrap?: 'soft' | 'hard' | 'off';
  autoFocus?: boolean;
  autofocus?: boolean; // alias
  autoComplete?: string;
  autocomplete?: string; // alias
  form?: string;
  value?: string;
}

/**
 * Label element attributes
 */
export interface LabelAttributes extends BaseElementAttributes {
  htmlFor?: string;
  for?: string; // alias
  form?: string;
}

/**
 * Option element attributes
 */
export interface OptionAttributes extends BaseElementAttributes {
  value?: string | number;
  disabled?: boolean;
  selected?: boolean;
  label?: string;
}

/**
 * Optgroup element attributes
 */
export interface OptgroupAttributes extends BaseElementAttributes {
  disabled?: boolean;
  label?: string;
}

/**
 * Table element attributes
 */
export interface TableAttributes extends BaseElementAttributes {
  border?: number | string;
  cellPadding?: number | string;
  cellSpacing?: number | string;
  width?: number | string;
  summary?: string;
}

/**
 * Table cell attributes (td, th)
 */
export interface TableCellAttributes extends BaseElementAttributes {
  colSpan?: number;
  colspan?: number; // alias
  rowSpan?: number;
  rowspan?: number; // alias
  headers?: string;
  scope?: 'row' | 'col' | 'rowgroup' | 'colgroup';
  abbr?: string;
}

/**
 * Iframe element attributes
 */
export interface IframeAttributes extends BaseElementAttributes {
  src?: string;
  srcDoc?: string;
  srcdoc?: string; // alias
  name?: string;
  width?: number | string;
  height?: number | string;
  sandbox?: string;
  allow?: string;
  allowFullScreen?: boolean;
  allowfullscreen?: boolean; // alias
  loading?: 'lazy' | 'eager';
  referrerPolicy?: ReferrerPolicy;

  // Event handlers
  onLoad?: string | ((event: Event) => void);
  onError?: string | ((event: Event) => void);
}

/**
 * Video element attributes
 */
export interface VideoAttributes extends BaseElementAttributes {
  src?: string;
  poster?: string;
  width?: number | string;
  height?: number | string;
  autoPlay?: boolean;
  autoplay?: boolean; // alias
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  playsinline?: boolean; // alias
  preload?: 'none' | 'metadata' | 'auto' | '';
  crossOrigin?: 'anonymous' | 'use-credentials' | '';

  // Event handlers
  onPlay?: string | ((event: Event) => void);
  onPause?: string | ((event: Event) => void);
  onEnded?: string | ((event: Event) => void);
  onLoadedMetadata?: string | ((event: Event) => void);
  onTimeUpdate?: string | ((event: Event) => void);
  onVolumeChange?: string | ((event: Event) => void);
  onError?: string | ((event: Event) => void);
}

/**
 * Audio element attributes
 */
export interface AudioAttributes extends BaseElementAttributes {
  src?: string;
  autoPlay?: boolean;
  autoplay?: boolean; // alias
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  preload?: 'none' | 'metadata' | 'auto' | '';
  crossOrigin?: 'anonymous' | 'use-credentials' | '';

  // Event handlers
  onPlay?: string | ((event: Event) => void);
  onPause?: string | ((event: Event) => void);
  onEnded?: string | ((event: Event) => void);
  onLoadedMetadata?: string | ((event: Event) => void);
  onTimeUpdate?: string | ((event: Event) => void);
  onVolumeChange?: string | ((event: Event) => void);
  onError?: string | ((event: Event) => void);
}

/**
 * Source element attributes (void element)
 */
export interface SourceAttributes extends GlobalHTMLAttributes {
  src?: string;
  srcSet?: string;
  srcset?: string; // alias
  type?: string;
  media?: string;
  sizes?: string;
  width?: number;
  height?: number;
}

/**
 * Track element attributes (void element)
 */
export interface TrackAttributes extends GlobalHTMLAttributes {
  kind?: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';
  src?: string;
  srcLang?: string;
  srclang?: string; // alias
  label?: string;
  default?: boolean;
}

/**
 * Canvas element attributes
 */
export interface CanvasAttributes extends BaseElementAttributes {
  width?: number | string;
  height?: number | string;
}

/**
 * Link element attributes (void element)
 */
export interface LinkAttributes extends GlobalHTMLAttributes {
  href?: string;
  rel?: string;
  type?: string;
  media?: string;
  as?: string;
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
  integrity?: string;
  referrerPolicy?: ReferrerPolicy;
  sizes?: string;
  disabled?: boolean;
  hrefLang?: string;
  imageSrcSet?: string;
  imageSizes?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
}

/**
 * Meta element attributes (void element)
 */
export interface MetaAttributes extends GlobalHTMLAttributes {
  name?: string;
  content?: string;
  httpEquiv?: string;
  'http-equiv'?: string; // alias
  charset?: string;
  property?: string;
  media?: string;
}

/**
 * Script element attributes
 */
export interface ScriptAttributes extends BaseElementAttributes {
  src?: string;
  type?: string;
  async?: boolean;
  defer?: boolean;
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
  integrity?: string;
  noModule?: boolean;
  nomodule?: boolean; // alias
  referrerPolicy?: ReferrerPolicy;
  blocking?: string;
  fetchPriority?: 'high' | 'low' | 'auto';

  // Event handlers
  onLoad?: string | ((event: Event) => void);
  onError?: string | ((event: Event) => void);
}

/**
 * Style element attributes
 */
export interface StyleAttributes extends BaseElementAttributes {
  type?: string;
  media?: string;
  nonce?: string;
  blocking?: string;
}

/**
 * Progress element attributes
 */
export interface ProgressAttributes extends BaseElementAttributes {
  value?: number;
  max?: number;
}

/**
 * Meter element attributes
 */
export interface MeterAttributes extends BaseElementAttributes {
  value?: number;
  min?: number;
  max?: number;
  low?: number;
  high?: number;
  optimum?: number;
}

/**
 * Details element attributes
 */
export interface DetailsAttributes extends BaseElementAttributes {
  open?: boolean;
  onToggle?: string | ((event: Event) => void);
}

/**
 * Dialog element attributes
 */
export interface DialogAttributes extends BaseElementAttributes {
  open?: boolean;
  onClose?: string | ((event: Event) => void);
  onCancel?: string | ((event: Event) => void);
}

/**
 * Time element attributes
 */
export interface TimeAttributes extends BaseElementAttributes {
  dateTime?: string;
  datetime?: string; // alias
}

/**
 * Output element attributes
 */
export interface OutputAttributes extends BaseElementAttributes {
  htmlFor?: string;
  for?: string; // alias
  form?: string;
  name?: string;
}

/**
 * Fieldset element attributes
 */
export interface FieldsetAttributes extends BaseElementAttributes {
  disabled?: boolean;
  form?: string;
  name?: string;
}

/**
 * Legend element attributes
 */
export interface LegendAttributes extends BaseElementAttributes {}

/**
 * Datalist element attributes
 */
export interface DatalistAttributes extends BaseElementAttributes {}

/**
 * Col element attributes (void element)
 */
export interface ColAttributes extends GlobalHTMLAttributes {
  span?: number;
}

/**
 * Colgroup element attributes
 */
export interface ColgroupAttributes extends BaseElementAttributes {
  span?: number;
}

/**
 * Area element attributes (void element)
 */
export interface AreaAttributes extends GlobalHTMLAttributes, GlobalEventHandlers {
  alt?: string;
  coords?: string;
  download?: string | boolean;
  href?: string;
  hrefLang?: string;
  ping?: string;
  referrerPolicy?: ReferrerPolicy;
  rel?: string;
  shape?: 'rect' | 'circle' | 'poly' | 'default';
  target?: '_self' | '_blank' | '_parent' | '_top' | string;
}

/**
 * Map element attributes
 */
export interface MapAttributes extends BaseElementAttributes {
  name?: string;
}

/**
 * Embed element attributes (void element)
 */
export interface EmbedAttributes extends GlobalHTMLAttributes, GlobalEventHandlers {
  src?: string;
  type?: string;
  width?: number | string;
  height?: number | string;
}

/**
 * Object element attributes
 */
export interface ObjectAttributes extends BaseElementAttributes {
  data?: string;
  type?: string;
  name?: string;
  useMap?: string;
  form?: string;
  width?: number | string;
  height?: number | string;
}

/**
 * Param element attributes (void element - deprecated but still supported)
 */
export interface ParamAttributes extends GlobalHTMLAttributes {
  name?: string;
  value?: string;
}

/**
 * Blockquote element attributes
 */
export interface BlockquoteAttributes extends BaseElementAttributes {
  cite?: string;
}

/**
 * Q element attributes
 */
export interface QAttributes extends BaseElementAttributes {
  cite?: string;
}

/**
 * Ins/Del element attributes
 */
export interface InsDelAttributes extends BaseElementAttributes {
  cite?: string;
  dateTime?: string;
  datetime?: string; // alias
}

/**
 * Referrer policy type
 */
export type ReferrerPolicy =
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url'
  | '';

// ============================================================================
// Void Element Tag Names
// ============================================================================

/**
 * HTML void elements that cannot have children.
 */
export type VoidElementTagNames =
  | 'area'
  | 'base'
  | 'br'
  | 'col'
  | 'embed'
  | 'hr'
  | 'img'
  | 'input'
  | 'link'
  | 'meta'
  | 'param'
  | 'source'
  | 'track'
  | 'wbr';

// ============================================================================
// HTML Element Attribute Map
// ============================================================================

/**
 * Maps HTML tag names to their specific attribute interfaces.
 */
export interface HTMLElementAttributeMap {
  // Interactive elements
  a: AnchorAttributes;
  button: ButtonAttributes;
  input: InputAttributes;
  select: SelectAttributes;
  textarea: TextareaAttributes;
  label: LabelAttributes;
  option: OptionAttributes;
  optgroup: OptgroupAttributes;
  output: OutputAttributes;
  datalist: DatalistAttributes;

  // Form elements
  form: FormAttributes;
  fieldset: FieldsetAttributes;
  legend: LegendAttributes;

  // Media elements
  img: ImgAttributes;
  video: VideoAttributes;
  audio: AudioAttributes;
  source: SourceAttributes;
  track: TrackAttributes;
  canvas: CanvasAttributes;
  picture: BaseElementAttributes;

  // Embedded content
  iframe: IframeAttributes;
  embed: EmbedAttributes;
  object: ObjectAttributes;
  param: ParamAttributes;
  map: MapAttributes;
  area: AreaAttributes;

  // Document metadata
  link: LinkAttributes;
  meta: MetaAttributes;
  base: GlobalHTMLAttributes;
  style: StyleAttributes;
  script: ScriptAttributes;
  noscript: BaseElementAttributes;

  // Table elements
  table: TableAttributes;
  caption: BaseElementAttributes;
  thead: BaseElementAttributes;
  tbody: BaseElementAttributes;
  tfoot: BaseElementAttributes;
  tr: BaseElementAttributes;
  td: TableCellAttributes;
  th: TableCellAttributes;
  col: ColAttributes;
  colgroup: ColgroupAttributes;

  // Progress/Meter
  progress: ProgressAttributes;
  meter: MeterAttributes;

  // Interactive elements
  details: DetailsAttributes;
  summary: BaseElementAttributes;
  dialog: DialogAttributes;

  // Text elements
  time: TimeAttributes;
  blockquote: BlockquoteAttributes;
  q: QAttributes;
  ins: InsDelAttributes;
  del: InsDelAttributes;

  // Void elements with only global attributes
  br: GlobalHTMLAttributes;
  hr: GlobalHTMLAttributes;
  wbr: GlobalHTMLAttributes;

  // Structural elements (all use base attributes)
  div: BaseElementAttributes;
  span: BaseElementAttributes;
  p: BaseElementAttributes;
  section: BaseElementAttributes;
  article: BaseElementAttributes;
  aside: BaseElementAttributes;
  header: BaseElementAttributes;
  footer: BaseElementAttributes;
  main: BaseElementAttributes;
  nav: BaseElementAttributes;
  figure: BaseElementAttributes;
  figcaption: BaseElementAttributes;
  address: BaseElementAttributes;
  hgroup: BaseElementAttributes;
  search: BaseElementAttributes;

  // Heading elements
  h1: BaseElementAttributes;
  h2: BaseElementAttributes;
  h3: BaseElementAttributes;
  h4: BaseElementAttributes;
  h5: BaseElementAttributes;
  h6: BaseElementAttributes;

  // List elements
  ul: BaseElementAttributes;
  ol: BaseElementAttributes;
  li: BaseElementAttributes;
  dl: BaseElementAttributes;
  dt: BaseElementAttributes;
  dd: BaseElementAttributes;
  menu: BaseElementAttributes;

  // Text formatting elements
  em: BaseElementAttributes;
  strong: BaseElementAttributes;
  small: BaseElementAttributes;
  s: BaseElementAttributes;
  cite: BaseElementAttributes;
  dfn: BaseElementAttributes;
  abbr: BaseElementAttributes;
  ruby: BaseElementAttributes;
  rt: BaseElementAttributes;
  rp: BaseElementAttributes;
  data: BaseElementAttributes;
  code: BaseElementAttributes;
  var: BaseElementAttributes;
  samp: BaseElementAttributes;
  kbd: BaseElementAttributes;
  sub: BaseElementAttributes;
  sup: BaseElementAttributes;
  i: BaseElementAttributes;
  b: BaseElementAttributes;
  u: BaseElementAttributes;
  mark: BaseElementAttributes;
  bdi: BaseElementAttributes;
  bdo: BaseElementAttributes;
  pre: BaseElementAttributes;

  // Document structure (typically not used in components)
  html: BaseElementAttributes;
  head: BaseElementAttributes;
  body: BaseElementAttributes;
  title: BaseElementAttributes;

  // Other elements
  template: BaseElementAttributes;
  slot: BaseElementAttributes;
}

// ============================================================================
// Strict Coherent Element Type
// ============================================================================

/**
 * Strict element type with per-element attribute validation.
 *
 * Use this type for strict type checking:
 * - Catches attribute typos (classname vs className)
 * - Catches element-specific attribute misuse (checked on div)
 * - Prevents children on void elements
 *
 * For permissive typing (backward compatibility), use CoherentElement from index.d.ts.
 *
 * @example
 * ```typescript
 * // Valid - input can have checked
 * const checkbox: StrictCoherentElement = {
 *   input: { type: 'checkbox', checked: true }
 * };
 *
 * // Error - div cannot have checked
 * const invalid: StrictCoherentElement = {
 *   div: { checked: true }  // Type error!
 * };
 *
 * // Error - img cannot have children
 * const invalidImg: StrictCoherentElement = {
 *   img: { src: 'foo.png', children: [{ span: {} }] }  // Type error!
 * };
 * ```
 */
export type StrictCoherentElement = {
  [K in keyof HTMLElementAttributeMap]?: K extends VoidElementTagNames
    ? Omit<HTMLElementAttributeMap[K], 'children'>
    : HTMLElementAttributeMap[K];
};
