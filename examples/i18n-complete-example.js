/**
 * @name Internationalization
 * @category Full Apps
 * @description Multi-language blog page with locale switching and RTL support.
 */

import { render } from '@coherent.js/core';
import { createTranslator, createFormatters, getLocaleDirection } from '@coherent.js/i18n';

// ============================================================================
// Translations
// ============================================================================

const translations = {
  en: {
    app: { title: 'My Blog', tagline: 'Thoughts on web development' },
    nav: { home: 'Home', about: 'About', contact: 'Contact' },
    post: { published: 'Published on {{date}}', readMore: 'Read more' }
  },
  fr: {
    app: { title: 'Mon Blog', tagline: 'Réflexions sur le développement web' },
    nav: { home: 'Accueil', about: 'À propos', contact: 'Contact' },
    post: { published: 'Publié le {{date}}', readMore: 'Lire la suite' }
  },
  es: {
    app: { title: 'Mi Blog', tagline: 'Reflexiones sobre desarrollo web' },
    nav: { home: 'Inicio', about: 'Acerca de', contact: 'Contacto' },
    post: { published: 'Publicado el {{date}}', readMore: 'Leer más' }
  },
  ar: {
    app: { title: 'مدونتي', tagline: 'أفكار حول تطوير الويب' },
    nav: { home: 'الرئيسية', about: 'حول', contact: 'اتصل' },
    post: { published: 'نُشر في {{date}}', readMore: 'اقرأ المزيد' }
  }
};

const translator = createTranslator({ defaultLocale: 'en', fallbackLocale: 'en' });
for (const [locale, messages] of Object.entries(translations)) {
  translator.addTranslations(locale, messages);
}

// ============================================================================
// Components — pure objects, translator passed as a prop
// ============================================================================

function Nav({ t }) {
  return {
    nav: {
      children: [
        { a: { href: '/', text: t('nav.home') } },
        { a: { href: '/about', text: t('nav.about') } },
        { a: { href: '/contact', text: t('nav.contact') } }
      ]
    }
  };
}

function Post({ t, fmt, title, body, date }) {
  return {
    article: {
      children: [
        { h2: { text: title } },
        { p: { className: 'meta', text: t('post.published', { date: fmt.date.format(date) }) } },
        { p: { text: body } },
        { a: { href: '#', text: t('post.readMore') } }
      ]
    }
  };
}

export function App({ locale = 'en' } = {}) {
  translator.setLocale(locale);
  const t = (key, params) => translator.t(key, params);
  const fmt = createFormatters(locale);

  return {
    html: {
      lang: locale,
      dir: getLocaleDirection(locale),
      children: [
        {
          body: {
            children: [
              { h1: { text: t('app.title') } },
              { p: { text: t('app.tagline') } },
              Nav({ t }),
              Post({
                t,
                fmt,
                title: t('app.title'),
                body: t('app.tagline'),
                date: new Date(2026, 0, 15)
              })
            ]
          }
        }
      ]
    }
  };
}

// ============================================================================
// Demo — render the page in several locales
// ============================================================================

console.log('='.repeat(80));
console.log('Internationalization example');
console.log('='.repeat(80));

for (const locale of ['en', 'fr', 'es', 'ar']) {
  const out = render(App({ locale }));
  const direction = getLocaleDirection(locale);
  console.log(`\n📝 ${locale} (${direction}): rendered ${out.length} characters`);
  console.log(`   Title: ${translations[locale].app.title}`);
}

console.log(`\n${'='.repeat(80)}`);
console.log('✅ All languages rendered successfully!');
console.log('='.repeat(80));

export { translations, translator };
