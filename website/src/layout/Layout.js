// Layout.js - shared layout for static site
export function Layout({ title = 'Coherent.js', sidebar = [], currentPath = '/' }) {
  return {
    html: {
      children: [
        { head: {
          children: [
            { meta: { charset: 'utf-8' } },
            { meta: { name: 'viewport', content: 'width=device-width, initial-scale=1' } },
            { title: { text: title } },
            { link: { rel: 'stylesheet', href: './styles.css' } }
          ]
        }},
        { body: {
          children: [
            { header: { className: 'site-header', children: [
              { a: { className: 'logo', href: '/', text: 'Coherent.js' } },
              { nav: { className: 'top-nav', children: [
                { a: { href: '/', className: currentPath === '/' ? 'active' : '', text: 'Home' } },
                { a: { href: '/docs', className: currentPath.startsWith('/docs') ? 'active' : '', text: 'Docs' } },
                { a: { href: '/examples', className: currentPath.startsWith('/examples') ? 'active' : '', text: 'Examples' } },
                { a: { href: '/performance', className: currentPath.startsWith('/performance') ? 'active' : '', text: 'Performance' } },
                { a: { href: '/changelog', className: currentPath.startsWith('/changelog') ? 'active' : '', text: 'Changelog' } }
              ] } }
            ] } },
            { main: { className: 'container', children: [
              { aside: { className: 'sidebar', children: buildSidebar(sidebar) } },
              { article: { className: 'content', children: [ { div: { id: 'coherent-content-placeholder', text: '[[[COHERENT_CONTENT_PLACEHOLDER]]]' } } ] } }
            ] } },
            { footer: { className: 'site-footer', children: [
              { p: { text: '© ' + new Date().getFullYear() + ' Coherent.js' } }
            ] } }
          ]
        }}
      ]
    }
  };
}

function buildSidebar(groups) {
  if (!Array.isArray(groups) || groups.length === 0) return [];
  return groups.map(group => ({
    section: {
      children: [
        { h4: { text: group.title } },
        { ul: { children: (group.items || []).map(item => ({
          li: { children: [ { a: { href: item.href, text: item.label } } ] }
        })) } }
      ]
    }
  }));
}
