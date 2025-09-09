export function createProfilerServer(profiler, options = {}) {
  const port = options.port || 3001;
  
  return {
    start() {
      console.log(`Performance profiler server would start on port ${port}`);
      return Promise.resolve();
    },
    stop() {
      console.log('Performance profiler server stopped');
      return Promise.resolve();
    }
  };
}