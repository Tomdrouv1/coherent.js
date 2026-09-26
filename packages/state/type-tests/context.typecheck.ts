/**
 * Type tests for the context API: a provider must be placeable in a core
 * component tree, and runWithContext must pass its callback's type through.
 */

import type { CoherentNode } from '@coherent.js/core';
import {
  createContextProvider,
  runWithContext,
  useContext,
  type ContextProvider,
} from '../types/index.js';

const button = { button: { text: 'Click' } };
const provider = createContextProvider('theme', 'dark', button);

const asProvider: ContextProvider<typeof button> = provider;
const inTree: CoherentNode = { div: { children: [provider] } };
const asNode: CoherentNode = provider;

const rendered: string = provider((children) => JSON.stringify(children));
const pending: Promise<string | undefined> = provider(async () => useContext<string>('theme'));

const syncResult: number = runWithContext(() => 1);
const asyncResult: Promise<string> = runWithContext(async () => 'done', { user: 'alice' });

// @ts-expect-error runWithContext requires a function
runWithContext('not a function');

export { asProvider, inTree, asNode, rendered, pending, syncResult, asyncResult };
