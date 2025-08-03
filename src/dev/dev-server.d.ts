// Type definitions for Coherent.js Development Server

export interface DevServerOptions {
  /**
   * Port to run the development server on
   * @default 3000
   */
  port?: number;
  
  /**
   * Host to bind the development server to
   * @default 'localhost'
   */
  host?: string;
  
  /**
   * Glob patterns to watch for file changes
   */
  watchPaths?: string[];
  
  /**
   * Paths to serve static files from
   * @default ['public']
   */
  staticPaths?: string[];
  
  /**
   * Enable or disable WebSocket for hot reload
   * @default true
   */
  enableWebSocket?: boolean;
  
  /**
   * Enable or disable file watching
   * @default true
   */
  enableWatching?: boolean;
  
  /**
   * Open browser automatically when server starts
   * @default true
   */
  openBrowser?: boolean;
}

export interface DevServerStats {
  /** Server start time */
  startTime: Date;
  
  /** Number of connected WebSocket clients */
  clients: number;
  
  /** Watched file patterns */
  watchPaths: string[];
  
  /** Static file paths */
  staticPaths: string[];
}

export class DevServer {
  /**
   * Create a new development server instance
   * @param options Configuration options
   */
  constructor(options?: DevServerOptions);
  
  /**
   * Setup Express middleware
   */
  setupMiddleware(): void;
  
  /**
   * Setup WebSocket server for hot reload
   */
  setupWebSocket(): void;
  
  /**
   * Setup Express routes
   */
  setupRoutes(): void;
  
  /**
   * Start watching files for changes
   */
  startWatching(): void;
  
  /**
   * Broadcast reload message to all connected clients
   */
  broadcastReload(): void;
  
  /**
   * Start the development server
   */
  start(): Promise<void>;
  
  /**
   * Stop the development server
   */
  stop(): Promise<void>;
  
  /**
   * Get server statistics
   */
  getStats(): DevServerStats;
  
  /**
   * Add a path to watch
   * @param path Glob pattern to watch
   */
  addWatchPath(path: string): void;
  
  /**
   * Remove a path from watching
   * @param path Glob pattern to remove
   */
  removeWatchPath(path: string): void;
}

export default DevServer;
