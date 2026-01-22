/**
 * Type Tests for Coherent.js Element Types
 *
 * These tests validate that StrictCoherentElement correctly types HTML elements
 * with per-element attribute validation, void element handling, and strict children.
 *
 * Run with: pnpm --filter @coherent.js/core run typecheck
 */

import { expectTypeOf } from 'vitest';
import type {
  CoherentChild,
  StrictCoherentElement,
  GlobalHTMLAttributes,
  GlobalEventHandlers,
  InputAttributes,
  ButtonAttributes,
  AnchorAttributes,
  ImgAttributes,
  FormAttributes,
  SelectAttributes,
  TextareaAttributes,
  LabelAttributes,
  HTMLElementAttributeMap,
  VoidElementTagNames,
  BaseElementAttributes,
} from '@coherent.js/core';

// ============================================================================
// Valid Element Structures
// ============================================================================

// Simple text element
expectTypeOf<{ div: { text: 'Hello' } }>().toMatchTypeOf<StrictCoherentElement>();

// Element with className
expectTypeOf<{ div: { className: 'my-class' } }>().toMatchTypeOf<StrictCoherentElement>();

// Element with class alias
expectTypeOf<{ div: { class: 'my-class' } }>().toMatchTypeOf<StrictCoherentElement>();

// Element with children array
expectTypeOf<{ div: { children: [{ span: { text: 'child' } }] } }>().toMatchTypeOf<StrictCoherentElement>();

// Conditional children (null/undefined allowed)
expectTypeOf<{ div: { children: [null, undefined, { span: {} }] } }>().toMatchTypeOf<StrictCoherentElement>();

// String child
expectTypeOf<{ div: { children: 'text content' } }>().toMatchTypeOf<StrictCoherentElement>();

// Number child
expectTypeOf<{ div: { children: 42 } }>().toMatchTypeOf<StrictCoherentElement>();

// Data attributes with template literal types
expectTypeOf<{ div: { 'data-testid': 'my-test', 'data-value': 123 } }>().toMatchTypeOf<StrictCoherentElement>();

// ARIA attributes
expectTypeOf<{
  div: { role: 'button'; 'aria-label': 'Click me'; 'aria-disabled': true };
}>().toMatchTypeOf<StrictCoherentElement>();

// Key prop for reconciliation
expectTypeOf<{ div: { key: 'unique-key', text: 'content' } }>().toMatchTypeOf<StrictCoherentElement>();

// Key with number
expectTypeOf<{ li: { key: 123, text: 'item' } }>().toMatchTypeOf<StrictCoherentElement>();

// Style as string
expectTypeOf<{ div: { style: 'color: red; font-size: 14px;' } }>().toMatchTypeOf<StrictCoherentElement>();

// Style as object
expectTypeOf<{
  div: { style: { color: 'red', fontSize: 14 } };
}>().toMatchTypeOf<StrictCoherentElement>();

// Global attributes
expectTypeOf<{
  div: {
    id: 'my-id';
    title: 'tooltip';
    lang: 'en';
    dir: 'ltr';
    tabIndex: 0;
    hidden: true;
    draggable: true;
  };
}>().toMatchTypeOf<StrictCoherentElement>();

// Raw HTML content
expectTypeOf<{ div: { html: '<strong>Bold</strong>' } }>().toMatchTypeOf<StrictCoherentElement>();

// ============================================================================
// Element-Specific Attributes (Valid)
// ============================================================================

// Input with checkbox attributes
expectTypeOf<{
  input: { type: 'checkbox'; checked: true; disabled: false; name: 'agree' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Input with text attributes
expectTypeOf<{
  input: { type: 'text'; value: 'hello'; placeholder: 'Enter text'; maxLength: 100 };
}>().toMatchTypeOf<StrictCoherentElement>();

// Input with number type
expectTypeOf<{
  input: { type: 'number'; min: 0; max: 100; step: 5; value: 50 };
}>().toMatchTypeOf<StrictCoherentElement>();

// Input with file type
expectTypeOf<{
  input: { type: 'file'; accept: 'image/*'; multiple: true };
}>().toMatchTypeOf<StrictCoherentElement>();

// Input with form association
expectTypeOf<{
  input: { type: 'submit'; form: 'my-form'; formAction: '/submit'; formMethod: 'post' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Button with submit type
expectTypeOf<{
  button: { type: 'submit'; disabled: true; form: 'my-form' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Button with popover attributes
expectTypeOf<{
  button: { type: 'button'; popoverTarget: 'popover-id'; popoverTargetAction: 'toggle' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Anchor with href
expectTypeOf<{
  a: { href: '/page'; target: '_blank'; rel: 'noopener noreferrer' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Anchor with download
expectTypeOf<{
  a: { href: '/file.pdf'; download: 'document.pdf' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Image (void element - no children)
expectTypeOf<{
  img: { src: '/image.png'; alt: 'description'; loading: 'lazy' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Image with full attributes
expectTypeOf<{
  img: {
    src: '/image.png';
    alt: 'description';
    width: 100;
    height: 100;
    loading: 'lazy';
    decoding: 'async';
    srcSet: '/image-2x.png 2x';
    sizes: '(max-width: 600px) 200px, 50vw';
    fetchPriority: 'high';
  };
}>().toMatchTypeOf<StrictCoherentElement>();

// Form with method
expectTypeOf<{
  form: { action: '/submit'; method: 'post'; noValidate: true };
}>().toMatchTypeOf<StrictCoherentElement>();

// Form with enctype
expectTypeOf<{
  form: { action: '/upload'; method: 'post'; encType: 'multipart/form-data' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Select with options
expectTypeOf<{
  select: { name: 'choice'; multiple: true; disabled: false; required: true };
}>().toMatchTypeOf<StrictCoherentElement>();

// Textarea with attributes
expectTypeOf<{
  textarea: { name: 'comment'; rows: 4; cols: 50; placeholder: 'Enter comment' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Textarea with wrap
expectTypeOf<{
  textarea: { name: 'text'; wrap: 'hard'; maxLength: 500; minLength: 10 };
}>().toMatchTypeOf<StrictCoherentElement>();

// Label with htmlFor
expectTypeOf<{
  label: { htmlFor: 'input-id'; text: 'Label text' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Option element
expectTypeOf<{
  option: { value: 'opt1'; selected: true; disabled: false };
}>().toMatchTypeOf<StrictCoherentElement>();

// Optgroup element
expectTypeOf<{
  optgroup: { label: 'Group 1'; disabled: false };
}>().toMatchTypeOf<StrictCoherentElement>();

// Table elements
expectTypeOf<{
  table: { border: 1; cellPadding: 5; cellSpacing: 0 };
}>().toMatchTypeOf<StrictCoherentElement>();

expectTypeOf<{
  td: { colSpan: 2; rowSpan: 1; headers: 'header1 header2' };
}>().toMatchTypeOf<StrictCoherentElement>();

expectTypeOf<{
  th: { scope: 'col'; abbr: 'H1' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Iframe element
expectTypeOf<{
  iframe: {
    src: '/embed';
    width: 560;
    height: 315;
    sandbox: 'allow-scripts';
    allow: 'fullscreen';
    loading: 'lazy';
  };
}>().toMatchTypeOf<StrictCoherentElement>();

// Video element
expectTypeOf<{
  video: {
    src: '/video.mp4';
    poster: '/poster.jpg';
    controls: true;
    autoPlay: false;
    loop: false;
    muted: true;
    playsInline: true;
  };
}>().toMatchTypeOf<StrictCoherentElement>();

// Audio element
expectTypeOf<{
  audio: {
    src: '/audio.mp3';
    controls: true;
    autoPlay: false;
    loop: true;
    preload: 'metadata';
  };
}>().toMatchTypeOf<StrictCoherentElement>();

// Canvas element
expectTypeOf<{
  canvas: { width: 300; height: 150; id: 'my-canvas' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Progress element
expectTypeOf<{
  progress: { value: 70; max: 100 };
}>().toMatchTypeOf<StrictCoherentElement>();

// Meter element
expectTypeOf<{
  meter: { value: 0.6; min: 0; max: 1; low: 0.25; high: 0.75; optimum: 0.5 };
}>().toMatchTypeOf<StrictCoherentElement>();

// Details/summary
expectTypeOf<{
  details: { open: true };
}>().toMatchTypeOf<StrictCoherentElement>();

// Dialog element
expectTypeOf<{
  dialog: { open: false };
}>().toMatchTypeOf<StrictCoherentElement>();

// Time element
expectTypeOf<{
  time: { dateTime: '2024-01-15'; text: 'January 15, 2024' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Output element
expectTypeOf<{
  output: { htmlFor: 'input1 input2'; form: 'calc-form'; name: 'result' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Fieldset element
expectTypeOf<{
  fieldset: { disabled: false; form: 'my-form'; name: 'personal-info' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Script element
expectTypeOf<{
  script: { src: '/app.js'; async: true; defer: false; type: 'module' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Link element (void)
expectTypeOf<{
  link: { href: '/style.css'; rel: 'stylesheet'; type: 'text/css'; media: 'screen' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Meta element (void)
expectTypeOf<{
  meta: { name: 'description'; content: 'Page description' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Meta with charset
expectTypeOf<{
  meta: { charset: 'UTF-8' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Blockquote with cite
expectTypeOf<{
  blockquote: { cite: 'https://example.com'; text: 'Quote text' };
}>().toMatchTypeOf<StrictCoherentElement>();

// Ins/Del elements
expectTypeOf<{
  ins: { cite: '/changelog'; dateTime: '2024-01-15'; text: 'New content' };
}>().toMatchTypeOf<StrictCoherentElement>();

expectTypeOf<{
  del: { cite: '/changelog'; dateTime: '2024-01-10'; text: 'Old content' };
}>().toMatchTypeOf<StrictCoherentElement>();

// ============================================================================
// Event Handlers (Valid)
// ============================================================================

// onClick with MouseEvent handler
expectTypeOf<{
  button: { onClick: (e: MouseEvent) => void };
}>().toMatchTypeOf<StrictCoherentElement>();

// onClick as string (for SSR attribute)
expectTypeOf<{
  button: { onClick: 'handleClick()' };
}>().toMatchTypeOf<StrictCoherentElement>();

// onSubmit with SubmitEvent
expectTypeOf<{
  form: { onSubmit: (e: SubmitEvent) => void };
}>().toMatchTypeOf<StrictCoherentElement>();

// onKeyDown with KeyboardEvent
expectTypeOf<{
  input: { onKeyDown: (e: KeyboardEvent) => void };
}>().toMatchTypeOf<StrictCoherentElement>();

// onFocus with FocusEvent
expectTypeOf<{
  input: { onFocus: (e: FocusEvent) => void };
}>().toMatchTypeOf<StrictCoherentElement>();

// onBlur with FocusEvent
expectTypeOf<{
  input: { onBlur: (e: FocusEvent) => void };
}>().toMatchTypeOf<StrictCoherentElement>();

// onChange handler
expectTypeOf<{
  input: { onChange: (e: Event) => void };
}>().toMatchTypeOf<StrictCoherentElement>();

// onInput handler
expectTypeOf<{
  textarea: { onInput: (e: Event) => void };
}>().toMatchTypeOf<StrictCoherentElement>();

// Drag events
expectTypeOf<{
  div: { onDragStart: (e: DragEvent) => void; onDrop: (e: DragEvent) => void };
}>().toMatchTypeOf<StrictCoherentElement>();

// Touch events
expectTypeOf<{
  div: { onTouchStart: (e: TouchEvent) => void; onTouchEnd: (e: TouchEvent) => void };
}>().toMatchTypeOf<StrictCoherentElement>();

// Animation events
expectTypeOf<{
  div: { onAnimationStart: (e: AnimationEvent) => void; onAnimationEnd: (e: AnimationEvent) => void };
}>().toMatchTypeOf<StrictCoherentElement>();

// Media element events
expectTypeOf<{
  video: { onPlay: (e: Event) => void; onPause: (e: Event) => void; onEnded: (e: Event) => void };
}>().toMatchTypeOf<StrictCoherentElement>();

// ============================================================================
// Invalid Structures (Must Error)
// ============================================================================

// @ts-expect-error - boolean is not a valid child
const boolChild: StrictCoherentElement = { div: { children: [true] } };

// @ts-expect-error - typo in className (lowercase n)
const typoClass: StrictCoherentElement = { div: { classname: 'foo' } };

// @ts-expect-error - checked is not valid on div
const checkedOnDiv: StrictCoherentElement = { div: { checked: true } };

// @ts-expect-error - disabled is not valid on span
const disabledOnSpan: StrictCoherentElement = { span: { disabled: true } };

// @ts-expect-error - href is not valid on div
const hrefOnDiv: StrictCoherentElement = { div: { href: '/page' } };

// @ts-expect-error - src is not valid on div
const srcOnDiv: StrictCoherentElement = { div: { src: '/image.png' } };

// @ts-expect-error - type is not valid on div (only on input, button, etc.)
const typeOnDiv: StrictCoherentElement = { div: { type: 'text' } };

// @ts-expect-error - rows is not valid on input (only on textarea)
const rowsOnInput: StrictCoherentElement = { input: { rows: 4 } };

// @ts-expect-error - cols is not valid on input (only on textarea)
const colsOnInput: StrictCoherentElement = { input: { cols: 50 } };

// @ts-expect-error - value attribute not valid on div
const valueOnDiv: StrictCoherentElement = { div: { value: 'test' } };

// @ts-expect-error - placeholder not valid on div
const placeholderOnDiv: StrictCoherentElement = { div: { placeholder: 'Enter...' } };

// @ts-expect-error - action is not valid on div (only on form)
const actionOnDiv: StrictCoherentElement = { div: { action: '/submit' } };

// @ts-expect-error - method is not valid on div (only on form)
const methodOnDiv: StrictCoherentElement = { div: { method: 'post' } };

// @ts-expect-error - target is not valid on div (only on a, form)
const targetOnDiv: StrictCoherentElement = { div: { target: '_blank' } };

// @ts-expect-error - alt is not valid on div (only on img, input[type=image], area)
const altOnDiv: StrictCoherentElement = { div: { alt: 'description' } };

// ============================================================================
// Void Elements Cannot Have Children
// ============================================================================

// img cannot have children
const imgWithChildren: StrictCoherentElement = {
  // @ts-expect-error - children not allowed on void element img
  img: { src: '/img.png', children: [{ span: {} }] },
};

// input cannot have children
const inputWithChildren: StrictCoherentElement = {
  // @ts-expect-error - children not allowed on void element input
  input: { type: 'text', children: 'text' },
};

// @ts-expect-error - br cannot have children
const brWithChildren: StrictCoherentElement = { br: { children: 'text' } };

// @ts-expect-error - hr cannot have children
const hrWithChildren: StrictCoherentElement = { hr: { children: [{ div: {} }] } };

// meta cannot have children
const metaWithChildren: StrictCoherentElement = {
  // @ts-expect-error - children not allowed on void element meta
  meta: { name: 'desc', children: 'text' },
};

// link cannot have children
const linkWithChildren: StrictCoherentElement = {
  // @ts-expect-error - children not allowed on void element link
  link: { href: '/style.css', children: [] },
};

// area cannot have children
const areaWithChildren: StrictCoherentElement = {
  // @ts-expect-error - children not allowed on void element area
  area: { href: '/page', children: 'text' },
};

// embed cannot have children
const embedWithChildren: StrictCoherentElement = {
  // @ts-expect-error - children not allowed on void element embed
  embed: { src: '/embed', children: [] },
};

// source cannot have children
const sourceWithChildren: StrictCoherentElement = {
  // @ts-expect-error - children not allowed on void element source
  source: { src: '/video.mp4', children: 'text' },
};

// track cannot have children
const trackWithChildren: StrictCoherentElement = {
  // @ts-expect-error - children not allowed on void element track
  track: { src: '/subs.vtt', children: [] },
};

// @ts-expect-error - wbr cannot have children
const wbrWithChildren: StrictCoherentElement = { wbr: { children: 'text' } };

// @ts-expect-error - col cannot have children
const colWithChildren: StrictCoherentElement = { col: { span: 2, children: [] } };

// ============================================================================
// Type Inference Tests
// ============================================================================

// CoherentChild type - valid types
expectTypeOf<string>().toMatchTypeOf<CoherentChild>();
expectTypeOf<number>().toMatchTypeOf<CoherentChild>();
expectTypeOf<null>().toMatchTypeOf<CoherentChild>();
expectTypeOf<undefined>().toMatchTypeOf<CoherentChild>();
expectTypeOf<StrictCoherentElement>().toMatchTypeOf<CoherentChild>();
expectTypeOf<StrictCoherentElement[]>().toMatchTypeOf<CoherentChild>();

// boolean is NOT a valid child
expectTypeOf<boolean>().not.toMatchTypeOf<CoherentChild>();

// HTMLElementAttributeMap has expected keys
expectTypeOf<HTMLElementAttributeMap>().toHaveProperty('div');
expectTypeOf<HTMLElementAttributeMap>().toHaveProperty('input');
expectTypeOf<HTMLElementAttributeMap>().toHaveProperty('button');
expectTypeOf<HTMLElementAttributeMap>().toHaveProperty('a');
expectTypeOf<HTMLElementAttributeMap>().toHaveProperty('form');
expectTypeOf<HTMLElementAttributeMap>().toHaveProperty('select');
expectTypeOf<HTMLElementAttributeMap>().toHaveProperty('textarea');
expectTypeOf<HTMLElementAttributeMap>().toHaveProperty('img');
expectTypeOf<HTMLElementAttributeMap>().toHaveProperty('video');
expectTypeOf<HTMLElementAttributeMap>().toHaveProperty('audio');

// Input-specific attributes are on InputAttributes
expectTypeOf<InputAttributes>().toHaveProperty('checked');
expectTypeOf<InputAttributes>().toHaveProperty('type');
expectTypeOf<InputAttributes>().toHaveProperty('value');
expectTypeOf<InputAttributes>().toHaveProperty('placeholder');
expectTypeOf<InputAttributes>().toHaveProperty('min');
expectTypeOf<InputAttributes>().toHaveProperty('max');
expectTypeOf<InputAttributes>().toHaveProperty('step');
expectTypeOf<InputAttributes>().toHaveProperty('pattern');
expectTypeOf<InputAttributes>().toHaveProperty('multiple');
expectTypeOf<InputAttributes>().toHaveProperty('accept');

// Button-specific attributes are on ButtonAttributes
expectTypeOf<ButtonAttributes>().toHaveProperty('type');
expectTypeOf<ButtonAttributes>().toHaveProperty('disabled');
expectTypeOf<ButtonAttributes>().toHaveProperty('form');
expectTypeOf<ButtonAttributes>().toHaveProperty('formAction');
expectTypeOf<ButtonAttributes>().toHaveProperty('popoverTarget');

// Anchor-specific attributes
expectTypeOf<AnchorAttributes>().toHaveProperty('href');
expectTypeOf<AnchorAttributes>().toHaveProperty('target');
expectTypeOf<AnchorAttributes>().toHaveProperty('rel');
expectTypeOf<AnchorAttributes>().toHaveProperty('download');

// Form-specific attributes
expectTypeOf<FormAttributes>().toHaveProperty('action');
expectTypeOf<FormAttributes>().toHaveProperty('method');
expectTypeOf<FormAttributes>().toHaveProperty('encType');
expectTypeOf<FormAttributes>().toHaveProperty('noValidate');

// Image-specific attributes (void element)
expectTypeOf<ImgAttributes>().toHaveProperty('src');
expectTypeOf<ImgAttributes>().toHaveProperty('alt');
expectTypeOf<ImgAttributes>().toHaveProperty('width');
expectTypeOf<ImgAttributes>().toHaveProperty('height');
expectTypeOf<ImgAttributes>().toHaveProperty('loading');
expectTypeOf<ImgAttributes>().toHaveProperty('srcSet');

// Select-specific attributes
expectTypeOf<SelectAttributes>().toHaveProperty('multiple');
expectTypeOf<SelectAttributes>().toHaveProperty('size');
expectTypeOf<SelectAttributes>().toHaveProperty('required');

// Textarea-specific attributes
expectTypeOf<TextareaAttributes>().toHaveProperty('rows');
expectTypeOf<TextareaAttributes>().toHaveProperty('cols');
expectTypeOf<TextareaAttributes>().toHaveProperty('wrap');

// Label-specific attributes
expectTypeOf<LabelAttributes>().toHaveProperty('htmlFor');
expectTypeOf<LabelAttributes>().toHaveProperty('for');

// GlobalHTMLAttributes has core attributes
expectTypeOf<GlobalHTMLAttributes>().toHaveProperty('id');
expectTypeOf<GlobalHTMLAttributes>().toHaveProperty('className');
expectTypeOf<GlobalHTMLAttributes>().toHaveProperty('class');
expectTypeOf<GlobalHTMLAttributes>().toHaveProperty('style');
expectTypeOf<GlobalHTMLAttributes>().toHaveProperty('title');
expectTypeOf<GlobalHTMLAttributes>().toHaveProperty('tabIndex');
expectTypeOf<GlobalHTMLAttributes>().toHaveProperty('hidden');
expectTypeOf<GlobalHTMLAttributes>().toHaveProperty('key');
expectTypeOf<GlobalHTMLAttributes>().toHaveProperty('role');

// GlobalEventHandlers has event handlers
expectTypeOf<GlobalEventHandlers>().toHaveProperty('onClick');
expectTypeOf<GlobalEventHandlers>().toHaveProperty('onSubmit');
expectTypeOf<GlobalEventHandlers>().toHaveProperty('onKeyDown');
expectTypeOf<GlobalEventHandlers>().toHaveProperty('onFocus');
expectTypeOf<GlobalEventHandlers>().toHaveProperty('onBlur');
expectTypeOf<GlobalEventHandlers>().toHaveProperty('onChange');
expectTypeOf<GlobalEventHandlers>().toHaveProperty('onInput');

// VoidElementTagNames type
expectTypeOf<'img'>().toMatchTypeOf<VoidElementTagNames>();
expectTypeOf<'input'>().toMatchTypeOf<VoidElementTagNames>();
expectTypeOf<'br'>().toMatchTypeOf<VoidElementTagNames>();
expectTypeOf<'hr'>().toMatchTypeOf<VoidElementTagNames>();
expectTypeOf<'meta'>().toMatchTypeOf<VoidElementTagNames>();
expectTypeOf<'link'>().toMatchTypeOf<VoidElementTagNames>();
expectTypeOf<'area'>().toMatchTypeOf<VoidElementTagNames>();
expectTypeOf<'embed'>().toMatchTypeOf<VoidElementTagNames>();
expectTypeOf<'source'>().toMatchTypeOf<VoidElementTagNames>();
expectTypeOf<'track'>().toMatchTypeOf<VoidElementTagNames>();
expectTypeOf<'wbr'>().toMatchTypeOf<VoidElementTagNames>();
expectTypeOf<'col'>().toMatchTypeOf<VoidElementTagNames>();
expectTypeOf<'base'>().toMatchTypeOf<VoidElementTagNames>();
expectTypeOf<'param'>().toMatchTypeOf<VoidElementTagNames>();

// div is NOT a void element
expectTypeOf<'div'>().not.toMatchTypeOf<VoidElementTagNames>();
expectTypeOf<'span'>().not.toMatchTypeOf<VoidElementTagNames>();
expectTypeOf<'button'>().not.toMatchTypeOf<VoidElementTagNames>();

// BaseElementAttributes has children
expectTypeOf<BaseElementAttributes>().toHaveProperty('children');
expectTypeOf<BaseElementAttributes>().toHaveProperty('text');
expectTypeOf<BaseElementAttributes>().toHaveProperty('html');

// Suppress unused variable warnings
void boolChild;
void typoClass;
void checkedOnDiv;
void disabledOnSpan;
void hrefOnDiv;
void srcOnDiv;
void typeOnDiv;
void rowsOnInput;
void colsOnInput;
void valueOnDiv;
void placeholderOnDiv;
void actionOnDiv;
void methodOnDiv;
void targetOnDiv;
void altOnDiv;
void imgWithChildren;
void inputWithChildren;
void brWithChildren;
void hrWithChildren;
void metaWithChildren;
void linkWithChildren;
void areaWithChildren;
void embedWithChildren;
void sourceWithChildren;
void trackWithChildren;
void wbrWithChildren;
void colWithChildren;
