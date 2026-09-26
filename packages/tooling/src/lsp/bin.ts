#!/usr/bin/env node
/**
 * `coherent-language-server` executable.
 *
 * Starts the Coherent.js language server over the transport named on the
 * command line (--stdio, --node-ipc or --socket=<port>). The library entry
 * (`@coherent.js/tooling/lsp`, server.ts) has no side effects; this file is
 * the only place that starts a connection on its own.
 */

import { startServer } from './server.js';

startServer();
