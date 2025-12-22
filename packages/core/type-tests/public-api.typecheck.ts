import { render } from '@coherent.js/core';

type Assert<T extends true> = T;
type IsEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
  ? true
  : false;

type RenderSig = typeof render;

type _render_returns_string = Assert<IsEqual<ReturnType<RenderSig>, string>>;
