import { hydrate, enableClientEvents, makeHydratable, registerEventHandler } from '@coherent.js/client';
import { createRouter } from '@coherent.js/client/router';
import '@coherent.js/client/hmr';

type Assert<T extends true> = T;
type IsEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
  ? true
  : false;

type _hydrate_returns_nullable = Assert<IsEqual<ReturnType<typeof hydrate> extends object | null ? true : false, true>>;
type _enableClientEvents_returns_void = Assert<IsEqual<ReturnType<typeof enableClientEvents>, void>>;
type _makeHydratable_returns_function = Assert<IsEqual<ReturnType<typeof makeHydratable> extends Function ? true : false, true>>;
type _registerEventHandler_returns_void = Assert<IsEqual<ReturnType<typeof registerEventHandler>, void>>;
type _createRouter_returns_any = Assert<IsEqual<ReturnType<typeof createRouter>, any>>;
