import type { server } from 'typescript/lib/tsserverlibrary';

function init() {
  function create(info: server.PluginCreateInfo) {
    // Set up decorator object
    const proxy: any = Object.create(null);
    for (let k of Object.keys(info.languageService) as Array<keyof import('typescript/lib/tsserverlibrary').LanguageService>) {
      const x = info.languageService[k]!;
      proxy[k] = (...args: any[]) => (x as Function).apply(info.languageService, args);
    }

    proxy.getCompletionsAtPosition = (fileName: string, position: number, options: any) => {
      const prior = info.languageService.getCompletionsAtPosition(fileName, position, options);
      if (!prior) return;

      return prior;
    };

    return proxy;
  }

  return { create };
}

export default init;
