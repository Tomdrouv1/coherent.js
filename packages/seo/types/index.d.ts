/**
 * Coherent.js SEO TypeScript Definitions
 * @module @coherent.js/seo
 */

import type { CoherentNode } from '@coherent.js/core';

// ============================================================================
// Meta Tags
// ============================================================================

/** Attributes of a `<meta>` element. */
export interface MetaAttributes {
  /** Meta name attribute (for standard meta tags) */
  name?: string;
  /** Meta property attribute (for Open Graph, etc.) */
  property?: string;
  /** Meta content value */
  content?: string | number;
  /** HTTP-equiv attribute */
  'http-equiv'?: string;
  /** Character set, for `<meta charset>` */
  charset?: string;
  [attribute: string]: unknown;
}

/** Attributes of a `<link>` element. */
export interface LinkAttributes {
  rel?: string;
  href?: string;
  hreflang?: string;
  type?: string;
  sizes?: string;
  [attribute: string]: unknown;
}

/** Twitter Card types. */
export type TwitterCardType = 'summary' | 'summary_large_image' | 'app' | 'player';

/** Site-wide values a builder falls back to. */
export interface MetaDefaults {
  /** Site name, used by `siteName()` when called with no argument */
  siteName?: string;
  /** Site base URL */
  siteUrl?: string;
  /** Default locale (e.g. `'en_US'`) */
  locale?: string;
  /** Twitter @username, emitted as `twitter:site` by `twitterCard()` */
  twitterHandle?: string;
  [key: string]: unknown;
}

/** Options for `image()`. */
export interface MetaImageOptions {
  width?: number | string;
  height?: number | string;
  alt?: string;
}

/** Options for `article()`. */
export interface ArticleMetaOptions {
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

/**
 * Fluent builder for SEO meta tags.
 *
 * Every setter is chainable and appends to `tags`; `build()` returns the
 * accumulated nodes, ready to spread into a `<head>`.
 *
 * ```ts
 * const tags = new MetaBuilder({ siteName: 'Acme' })
 *   .title('Pricing', { template: '%s | Acme' })
 *   .description('Plans and pricing')
 *   .build();
 * ```
 */
export class MetaBuilder {
  constructor(defaults?: MetaDefaults);

  /** Site-wide fallbacks passed to the constructor */
  defaults: MetaDefaults;
  /** Nodes accumulated so far */
  tags: CoherentNode[];

  /** Set the page title, plus `og:title` and `twitter:title` */
  title(title: string, options?: { template?: string }): this;

  /** Set the description, plus `og:description` and `twitter:description` */
  description(description: string): this;

  /** Add a canonical `<link>`, plus `og:url` */
  canonical(url: string): this;

  /** Set the keywords meta tag */
  keywords(keywords: string | string[]): this;

  /** Set the robots meta tag */
  robots(directives: string | string[]): this;

  /** Add an `og:<property>` meta tag */
  og(property: string, content: string | number): this;

  /** Add a `twitter:<name>` meta tag */
  twitter(name: string, content: string | number): this;

  /** Add sharing image tags for both Open Graph and Twitter */
  image(url: string, options?: MetaImageOptions): this;

  /** Mark the page as an article and add `article:*` tags */
  article(options?: ArticleMetaOptions): this;

  /** Set the Twitter card type, plus `twitter:site` when a handle is configured */
  twitterCard(type?: TwitterCardType): this;

  /** Set `og:locale`, plus one `og:locale:alternate` per alternate */
  locale(locale: string, alternates?: string[]): this;

  /** Set `og:site_name`, defaulting to the configured site name */
  siteName(name?: string): this;

  /** Append an arbitrary `<meta>` tag */
  meta(attributes: MetaAttributes): this;

  /** Append an arbitrary `<link>` tag */
  link(attributes: LinkAttributes): this;

  /** Return the accumulated tags */
  build(): CoherentNode[];

  /** Discard the accumulated tags */
  reset(): this;
}

/** Create a {@link MetaBuilder}. */
export function createMetaBuilder(defaults?: MetaDefaults): MetaBuilder;

/** Options for {@link generateMeta}. */
export interface GenerateMetaOptions {
  /** Site-wide fallbacks for the underlying builder */
  defaults?: MetaDefaults;
  title?: string;
  /** Title template (e.g. `'%s | My Site'`) */
  titleTemplate?: string;
  description?: string;
  canonical?: string;
  keywords?: string | string[];
  image?: { url: string } & MetaImageOptions;
  robots?: string | string[];
  article?: ArticleMetaOptions;
  /** Card type, or `false` to omit Twitter card tags entirely */
  twitterCard?: TwitterCardType | false;
  locale?: string;
  alternateLocales?: string[];
  siteName?: string;
}

/** Build meta tags in one call. */
export function generateMeta(options?: GenerateMetaOptions): CoherentNode[];

// ============================================================================
// Sitemap Generator
// ============================================================================

/** Per-URL sitemap options. */
export interface SitemapEntryOptions {
  /** Last modification date; defaults to today (`YYYY-MM-DD`) */
  lastmod?: string;
  /** Change frequency; defaults to `'weekly'` */
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  /** Priority from 0.0 to 1.0; defaults to `0.5` */
  priority?: number;
  [key: string]: unknown;
}

/** A stored sitemap entry, with the URL resolved against the hostname. */
export interface SitemapEntry extends SitemapEntryOptions {
  loc: string;
}

/** Sitemap generator options. */
export interface SitemapOptions {
  /** Site hostname (e.g. `'https://example.com'`), prepended to relative URLs */
  hostname?: string;
  /** urlset XML namespace */
  xmlns?: string;
  [key: string]: unknown;
}

/** Generates an XML sitemap. */
export class SitemapGenerator {
  constructor(options?: SitemapOptions);

  options: SitemapOptions;
  /** Entries added so far */
  urls: SitemapEntry[];

  /** Add one URL, relative or absolute */
  add(url: string, options?: SitemapEntryOptions): this;

  /** Add several URLs, as strings or as `{ url, ...options }` objects */
  addMultiple(urls: Array<string | ({ url: string } & SitemapEntryOptions)>): this;

  /** Resolve a relative URL against the configured hostname */
  normalizeUrl(url: string): string;

  /** Render the sitemap XML */
  generate(): string;

  /** Escape XML special characters */
  escapeXml(value: unknown): string;

  /** Discard all entries */
  clear(): this;

  /** Number of entries added */
  count(): number;
}

/** Create a {@link SitemapGenerator}. */
export function createSitemapGenerator(options?: SitemapOptions): SitemapGenerator;

/** Build sitemap XML in one call. */
export function generateSitemap(
  urls: Array<string | ({ url: string } & SitemapEntryOptions)>,
  options?: SitemapOptions
): string;

// ============================================================================
// Structured Data (JSON-LD)
// ============================================================================

/** A schema.org object. */
export interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: unknown;
}

export interface OrganizationData {
  name: string;
  url?: string;
  logo?: string;
  description?: string;
  contactPoint?: Record<string, unknown>;
  /** Emitted as `sameAs` */
  socialLinks?: string[];
}

export interface WebSiteData {
  name: string;
  url?: string;
  description?: string;
  searchAction?: {
    target: string;
    /** Defaults to `'required name=search_term_string'` */
    queryInput?: string;
  };
}

export interface ArticleData {
  headline: string;
  description?: string;
  image?: string | string[];
  author?: { name: string; url?: string };
  publisher?: { name: string; logo?: string };
  datePublished?: string;
  dateModified?: string;
}

export interface ProductData {
  name: string;
  description?: string;
  image?: string | string[];
  brand?: string;
  offers?: {
    price: number | string;
    /** Defaults to `'USD'` */
    currency?: string;
    /** Defaults to `'https://schema.org/InStock'` */
    availability?: string;
    url?: string;
  };
  rating?: { value: number; count: number };
}

export interface BreadcrumbItem {
  name: string;
  url?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface PersonData {
  name: string;
  url?: string;
  image?: string;
  jobTitle?: string;
  /** Emitted as `worksFor` */
  organization?: string;
  /** Emitted as `sameAs` */
  socialLinks?: string[];
}

/** The schema shorthands {@link generateStructuredData} understands. */
export type StructuredDataType =
  | 'organization'
  | 'website'
  | 'article'
  | 'product'
  | 'breadcrumb'
  | 'faq'
  | 'person';

/**
 * Accumulates schema.org objects and renders them as one JSON-LD script node.
 */
export class StructuredDataBuilder {
  constructor();

  /** Schemas added so far */
  schemas: StructuredData[];

  /** Add a schema object verbatim */
  add(schema: Record<string, unknown>): this;

  organization(data: OrganizationData): this;
  website(data: WebSiteData): this;
  article(data: ArticleData): this;
  product(data: ProductData): this;
  breadcrumb(items: BreadcrumbItem[]): this;
  faq(questions: FAQItem[]): this;
  person(data: PersonData): this;

  /** Render a `<script type="application/ld+json">` node, or `null` if empty */
  build(): CoherentNode | null;

  /** Serialize the schemas as a JSON string */
  toJSON(): string;

  /** Discard all schemas */
  clear(): this;
}

/** Create a {@link StructuredDataBuilder}. */
export function createStructuredData(): StructuredDataBuilder;

/**
 * Build a single schema and render it as a JSON-LD script node.
 *
 * An unrecognized `type` adds `data` verbatim.
 */
export function generateStructuredData(
  type: StructuredDataType | (string & {}),
  data: Record<string, unknown>
): CoherentNode | null;
