// Examples.js - lists available example scripts
export function Examples({ items = [] } = {}) {
  return {
    section: {
      children: [
        { h1: { text: 'Examples' } },
        { p: { text: 'Explore Coherent.js examples. Run them locally from the repository root.' } },
        { pre: { children: [ { code: { text: 'node examples/<example>.js' } } ] } },
        items.length
          ? { ul: { className: 'examples-list', children: items.map(ex => ({
              li: {
                children: [
                  { strong: { text: ex.label } },
                  { span: { text: ' — ' + (ex.description || 'example script') } },
                  { br: {} },
                  { code: { text: ex.runCmd || `node examples/${ex.file}` } }
                ]
              }
            })) } }
          : { p: { text: 'No examples found.' } }
      ]
    }
  };
}
