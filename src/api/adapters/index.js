/**
 * API adapters for Coherent.js
 */

import { BaseAdapter } from './base.js';
import { RestAdapter } from './rest.js';
import { RpcAdapter } from './rpc.js';
import { GraphqlAdapter } from './graphql.js';

export { BaseAdapter, RestAdapter, RpcAdapter, GraphqlAdapter };

// Export adapter utilities
export default {
  BaseAdapter,
  RestAdapter,
  RpcAdapter,
  GraphqlAdapter
};
