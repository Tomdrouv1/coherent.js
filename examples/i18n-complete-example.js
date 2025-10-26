/**
 * Complete i18n Example - Multi-language Blog Application
 * 
 * This example demonstrates:
 * - Setting up translations
 * - Language switching
 * - Number/date/currency formatting
 * - RTL support
 * - Pluralization
 * - Nested translations
 */

import { html, renderToString } from '@coherentjs/core';
import { createTranslator, formatters } from '@coherentjs/i18n';

// ============================================================================
// Translation Files
// ============================================================================

const translations = {
  en: {
    app: {
      title: 'My Blog',
      tagline: 'Thoughts on web development',
    },
    nav: {
      home: 'Home',
      about: 'About',
      contact: 'Contact',
      language: 'Language',
    },
    blog: {
      readMore: 'Read more',
      publishedOn: 'Published on {date}',
      author: 'By {author}',
      comments: {
        zero: 'No comments',
        one: '1 comment',
        other: '{count} comments',
      },
      tags: 'Tags',
      share: 'Share this post',
    },
    footer: {
      copyright: '© {year} My Blog. All rights reserved.',
      followUs: 'Follow us',
    },
    stats: {
      views: '{count, number} views',
      likes: '{count, number} likes',
      shares: '{count, number} shares',
    },
    price: {
      amount: '{amount, currency}',
      from: 'From {amount, currency}',
    },
  },
  fr: {
    app: {
      title: 'Mon Blog',
      tagline: 'Réflexions sur le développement web',
    },
    nav: {
      home: 'Accueil',
      about: 'À propos',
      contact: 'Contact',
      language: 'Langue',
    },
    blog: {
      readMore: 'Lire la suite',
      publishedOn: 'Publié le {date}',
      author: 'Par {author}',
      comments: {
        zero: 'Aucun commentaire',
        one: '1 commentaire',
        other: '{count} commentaires',
      },
      tags: 'Étiquettes',
      share: 'Partager cet article',
    },
    footer: {
      copyright: '© {year} Mon Blog. Tous droits réservés.',
      followUs: 'Suivez-nous',
    },
    stats: {
      views: '{count, number} vues',
      likes: '{count, number} j\'aime',
      shares: '{count, number} partages',
    },
    price: {
      amount: '{amount, currency}',
      from: 'À partir de {amount, currency}',
    },
  },
  es: {
    app: {
      title: 'Mi Blog',
      tagline: 'Reflexiones sobre desarrollo web',
    },
    nav: {
      home: 'Inicio',
      about: 'Acerca de',
      contact: 'Contacto',
      language: 'Idioma',
    },
    blog: {
      readMore: 'Leer más',
      publishedOn: 'Publicado el {date}',
      author: 'Por {author}',
      comments: {
        zero: 'Sin comentarios',
        one: '1 comentario',
        other: '{count} comentarios',
      },
      tags: 'Etiquetas',
      share: 'Compartir esta publicación',
    },
    footer: {
      copyright: '© {year} Mi Blog. Todos los derechos reservados.',
      followUs: 'Síguenos',
    },
    stats: {
      views: '{count, number} vistas',
      likes: '{count, number} me gusta',
      shares: '{count, number} compartidos',
    },
    price: {
      amount: '{amount, currency}',
      from: 'Desde {amount, currency}',
    },
  },
  ar: {
    app: {
      title: 'مدونتي',
      tagline: 'أفكار حول تطوير الويب',
    },
    nav: {
      home: 'الرئيسية',
      about: 'حول',
      contact: 'اتصل',
      language: 'اللغة',
    },
    blog: {
      readMore: 'اقرأ المزيد',
      publishedOn: 'نُشر في {date}',
      author: 'بواسطة {author}',
      comments: {
        zero: 'لا توجد تعليقات',
        one: 'تعليق واحد',
        other: '{count} تعليقات',
      },
      tags: 'الوسوم',
      share: 'شارك هذا المنشور',
    },
    footer: {
      copyright: '© {year} مدونتي. جميع الحقوق محفوظة.',
      followUs: 'تابعنا',
    },
    stats: {
      views: '{count, number} مشاهدة',
      likes: '{count, number} إعجاب',
      shares: '{count, number} مشاركة',
    },
    price: {
      amount: '{amount, currency}',
      from: 'من {amount, currency}',
    },
  },
};

// ============================================================================
// Locale Configuration
// ============================================================================

const localeConfig = {
  en: {
    name: 'English',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
  },
  fr: {
    name: 'Français',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    currency: 'EUR',
  },
  es: {
    name: 'Español',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    currency: 'EUR',
  },
  ar: {
    name: 'العربية',
    direction: 'rtl',
    dateFormat: 'DD/MM/YYYY',
    currency: 'SAR',
  },
};

// ============================================================================
// Sample Blog Data
// ============================================================================

const blogPosts = [
  {
    id: 1,
    title: {
      en: 'Getting Started with Web Components',
      fr: 'Débuter avec les Web Components',
      es: 'Comenzando con Web Components',
      ar: 'البدء مع مكونات الويب',
    },
    excerpt: {
      en: 'Learn how to build reusable web components...',
      fr: 'Apprenez à créer des composants web réutilisables...',
      es: 'Aprende a construir componentes web reutilizables...',
      ar: 'تعلم كيفية بناء مكونات ويب قابلة لإعادة الاستخدام...',
    },
    author: 'John Doe',
    publishedDate: new Date('2024-01-15'),
    views: 1234,
    likes: 56,
    shares: 12,
    comments: 8,
    tags: ['web-components', 'javascript', 'tutorial'],
    price: 29.99,
  },
  {
    id: 2,
    title: {
      en: 'Advanced State Management',
      fr: 'Gestion d\'état avancée',
      es: 'Gestión de estado avanzada',
      ar: 'إدارة الحالة المتقدمة',
    },
    excerpt: {
      en: 'Deep dive into state management patterns...',
      fr: 'Plongée profonde dans les modèles de gestion d\'état...',
      es: 'Inmersión profunda en patrones de gestión de estado...',
      ar: 'غوص عميق في أنماط إدارة الحالة...',
    },
    author: 'Jane Smith',
    publishedDate: new Date('2024-01-10'),
    views: 2345,
    likes: 89,
    shares: 23,
    comments: 15,
    tags: ['state-management', 'architecture', 'advanced'],
    price: 39.99,
  },
  {
    id: 3,
    title: {
      en: 'Performance Optimization Tips',
      fr: 'Conseils d\'optimisation des performances',
      es: 'Consejos de optimización de rendimiento',
      ar: 'نصائح تحسين الأداء',
    },
    excerpt: {
      en: 'Make your applications faster and more efficient...',
      fr: 'Rendez vos applications plus rapides et plus efficaces...',
      es: 'Haz tus aplicaciones más rápidas y eficientes...',
      ar: 'اجعل تطبيقاتك أسرع وأكثر كفاءة...',
    },
    author: 'Bob Johnson',
    publishedDate: new Date('2024-01-05'),
    views: 3456,
    likes: 123,
    shares: 45,
    comments: 0,
    tags: ['performance', 'optimization', 'best-practices'],
    price: 49.99,
  },
];

// ============================================================================
// Components
// ============================================================================

/**
 * Language Selector Component
 */
function LanguageSelector({ currentLocale, onLanguageChange, t }) {
  const languages = Object.keys(translations);
  
  return html`
    <div class="language-selector">
      <label>${t('nav.language')}:</label>
      <select onchange="${(e) => onLanguageChange(e.target.value)}" value="${currentLocale}">
        ${languages.map(lang => html`
          <option value="${lang}" ${lang === currentLocale ? 'selected' : ''}>
            ${localeConfig[lang].name}
          </option>
        `)}
      </select>
    </div>
  `;
}

/**
 * Navigation Component
 */
function Navigation({ locale, t }) {
  return html`
    <nav class="navigation">
      <ul>
        <li><a href="/">${t('nav.home')}</a></li>
        <li><a href="/about">${t('nav.about')}</a></li>
        <li><a href="/contact">${t('nav.contact')}</a></li>
      </ul>
    </nav>
  `;
}

/**
 * Blog Post Card Component
 */
function BlogPostCard({ post, locale, t, formatNumber, formatCurrency, formatDate }) {
  const config = localeConfig[locale];
  
  // Get pluralized comment count
  const commentCount = post.comments;
  const commentKey = commentCount === 0 ? 'zero' : commentCount === 1 ? 'one' : 'other';
  const commentsText = t(`blog.comments.${commentKey}`, { count: commentCount });
  
  return html`
    <article class="blog-post-card" dir="${config.direction}">
      <h2>${post.title[locale]}</h2>
      
      <div class="post-meta">
        <span class="author">${t('blog.author', { author: post.author })}</span>
        <span class="date">
          ${t('blog.publishedOn', { 
            date: formatDate(post.publishedDate, { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }) 
          })}
        </span>
      </div>
      
      <p class="excerpt">${post.excerpt[locale]}</p>
      
      <div class="post-stats">
        <span class="views">${t('stats.views', { count: formatNumber(post.views) })}</span>
        <span class="likes">${t('stats.likes', { count: formatNumber(post.likes) })}</span>
        <span class="shares">${t('stats.shares', { count: formatNumber(post.shares) })}</span>
        <span class="comments">${commentsText}</span>
      </div>
      
      <div class="post-tags">
        <strong>${t('blog.tags')}:</strong>
        ${post.tags.map(tag => html`<span class="tag">${tag}</span>`)}
      </div>
      
      <div class="post-price">
        ${t('price.from', { amount: formatCurrency(post.price, config.currency) })}
      </div>
      
      <div class="post-actions">
        <button class="btn-primary">${t('blog.readMore')}</button>
        <button class="btn-secondary">${t('blog.share')}</button>
      </div>
    </article>
  `;
}

/**
 * Footer Component
 */
function Footer({ t, formatNumber }) {
  const currentYear = new Date().getFullYear();
  
  return html`
    <footer class="footer">
      <p>${t('footer.copyright', { year: currentYear })}</p>
      <div class="social-links">
        <p>${t('footer.followUs')}:</p>
        <a href="https://twitter.com">Twitter</a>
        <a href="https://github.com">GitHub</a>
        <a href="https://linkedin.com">LinkedIn</a>
      </div>
    </footer>
  `;
}

/**
 * Main App Component
 */
function App({ locale = 'en' }) {
  // Create translator
  const translator = createTranslator(translations, locale);
  const t = translator.t.bind(translator);
  
  // Get locale configuration
  const config = localeConfig[locale];
  
  // Create formatters
  const formatNumber = (num) => formatters.number(num, locale);
  const formatCurrency = (amount, currency) => formatters.currency(amount, locale, currency);
  const formatDate = (date, options) => formatters.date(date, locale, options);
  
  return html`
    <!DOCTYPE html>
    <html lang="${locale}" dir="${config.direction}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t('app.title')}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
          }
          
          [dir="rtl"] {
            text-align: right;
          }
          
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          
          header {
            background: white;
            padding: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
          }
          
          .header-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          h1 {
            color: #2c3e50;
            margin-bottom: 5px;
          }
          
          .tagline {
            color: #7f8c8d;
            font-size: 0.9em;
          }
          
          .language-selector {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .language-selector select {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
          }
          
          .navigation {
            background: #34495e;
            margin-bottom: 30px;
          }
          
          .navigation ul {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            list-style: none;
            display: flex;
            gap: 30px;
          }
          
          .navigation a {
            color: white;
            text-decoration: none;
            padding: 15px 0;
            display: block;
          }
          
          .navigation a:hover {
            color: #3498db;
          }
          
          .blog-posts {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 30px;
            margin-bottom: 50px;
          }
          
          .blog-post-card {
            background: white;
            border-radius: 8px;
            padding: 25px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s;
          }
          
          .blog-post-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          
          .blog-post-card h2 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.5em;
          }
          
          .post-meta {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            font-size: 0.9em;
            color: #7f8c8d;
          }
          
          .excerpt {
            margin-bottom: 20px;
            color: #555;
          }
          
          .post-stats {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            font-size: 0.9em;
            color: #7f8c8d;
            flex-wrap: wrap;
          }
          
          .post-tags {
            margin-bottom: 15px;
          }
          
          .tag {
            display: inline-block;
            background: #ecf0f1;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            margin: 0 5px;
          }
          
          .post-price {
            font-size: 1.2em;
            font-weight: bold;
            color: #27ae60;
            margin-bottom: 15px;
          }
          
          .post-actions {
            display: flex;
            gap: 10px;
          }
          
          button {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
          }
          
          .btn-primary {
            background: #3498db;
            color: white;
          }
          
          .btn-primary:hover {
            background: #2980b9;
          }
          
          .btn-secondary {
            background: #ecf0f1;
            color: #2c3e50;
          }
          
          .btn-secondary:hover {
            background: #bdc3c7;
          }
          
          .footer {
            background: #2c3e50;
            color: white;
            padding: 30px 0;
            text-align: center;
          }
          
          .social-links {
            margin-top: 15px;
          }
          
          .social-links a {
            color: #3498db;
            margin: 0 10px;
            text-decoration: none;
          }
          
          .social-links a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <header>
          <div class="header-content">
            <div>
              <h1>${t('app.title')}</h1>
              <p class="tagline">${t('app.tagline')}</p>
            </div>
            ${LanguageSelector({ 
              currentLocale: locale, 
              onLanguageChange: (newLocale) => {
                // In a real app, this would update the URL or state
                console.log('Language changed to:', newLocale);
              },
              t 
            })}
          </div>
        </header>
        
        ${Navigation({ locale, t })}
        
        <div class="container">
          <div class="blog-posts">
            ${blogPosts.map(post => BlogPostCard({ 
              post, 
              locale, 
              t, 
              formatNumber, 
              formatCurrency, 
              formatDate 
            }))}
          </div>
        </div>
        
        ${Footer({ t, formatNumber })}
      </body>
    </html>
  `;
}

// ============================================================================
// Demo: Render in Different Languages
// ============================================================================

console.log('='.repeat(80));
console.log('Coherent.js i18n Complete Example');
console.log('='.repeat(80));

// Render in English
console.log('\n📝 Rendering in English...\n');
const htmlEn = renderToString(App({ locale: 'en' }));
console.log('✅ English version rendered successfully');
console.log(`   Length: ${htmlEn.length} characters`);

// Render in French
console.log('\n📝 Rendering in French...\n');
const htmlFr = renderToString(App({ locale: 'fr' }));
console.log('✅ French version rendered successfully');
console.log(`   Length: ${htmlFr.length} characters`);

// Render in Spanish
console.log('\n📝 Rendering in Spanish...\n');
const htmlEs = renderToString(App({ locale: 'es' }));
console.log('✅ Spanish version rendered successfully');
console.log(`   Length: ${htmlEs.length} characters`);

// Render in Arabic (RTL)
console.log('\n📝 Rendering in Arabic (RTL)...\n');
const htmlAr = renderToString(App({ locale: 'ar' }));
console.log('✅ Arabic version rendered successfully');
console.log(`   Length: ${htmlAr.length} characters`);
console.log('   Direction: RTL (Right-to-Left)');

console.log('\n' + '='.repeat(80));
console.log('✅ All languages rendered successfully!');
console.log('='.repeat(80));

// Export for use in other files
export { App, translations, localeConfig };
