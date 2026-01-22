/**
 * Coherent.js SEO TypeScript Definitions
 * @module @coherent.js/seo
 */

import type { CoherentNode } from '@coherent.js/core';

// ============================================================================
// Meta Tag Types
// ============================================================================

/**
 * Generic meta tag definition
 */
export interface MetaTag {
  /** Meta name attribute (for standard meta tags) */
  name?: string;
  /** Meta property attribute (for Open Graph, etc.) */
  property?: string;
  /** Meta content value */
  content: string;
  /** HTTP-equiv attribute */
  httpEquiv?: string;
}

/**
 * Open Graph image configuration
 */
export interface OpenGraphImage {
  /** Image URL */
  url: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** Image alt text */
  alt?: string;
  /** Image MIME type */
  type?: string;
}

/**
 * Open Graph meta configuration
 */
export interface OpenGraphMeta {
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Content type */
  type?: 'website' | 'article' | 'book' | 'profile' | 'video.movie' | 'video.episode' | 'music.song' | 'music.album';
  /** Page URL */
  url?: string;
  /** Image(s) for sharing */
  image?: string | OpenGraphImage | (string | OpenGraphImage)[];
  /** Site name */
  siteName?: string;
  /** Locale (e.g., 'en_US') */
  locale?: string;
  /** Alternate locales */
  alternateLocales?: string[];
  /** Audio URL */
  audio?: string;
  /** Video URL */
  video?: string;
  /** Determiner (a, an, the, auto, or empty) */
  determiner?: 'a' | 'an' | 'the' | 'auto' | '';
}

/**
 * Twitter Card meta configuration
 */
export interface TwitterMeta {
  /** Card type */
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  /** Twitter @username of website */
  site?: string;
  /** Twitter @username of content creator */
  creator?: string;
  /** Card title (defaults to og:title) */
  title?: string;
  /** Card description (defaults to og:description) */
  description?: string;
  /** Card image (defaults to og:image) */
  image?: string;
  /** Image alt text */
  imageAlt?: string;
  /** App ID for app cards */
  appIdIphone?: string;
  /** App ID for iPad */
  appIdIpad?: string;
  /** App ID for Google Play */
  appIdGooglePlay?: string;
}

/**
 * Comprehensive SEO configuration
 */
export interface SEOConfig {
  /** Page title */
  title: string;
  /** Title template (e.g., '%s | My Site') */
  titleTemplate?: string;
  /** Page description */
  description?: string;
  /** Canonical URL */
  canonical?: string;
  /** Robots directives (e.g., 'index, follow') */
  robots?: string;
  /** Additional meta tags */
  meta?: MetaTag[];
  /** Open Graph configuration */
  openGraph?: OpenGraphMeta;
  /** Twitter Card configuration */
  twitter?: TwitterMeta;
  /** JSON-LD structured data */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Keywords (comma-separated or array) */
  keywords?: string | string[];
  /** Author name */
  author?: string;
  /** Viewport settings */
  viewport?: string;
  /** Character set */
  charset?: string;
  /** Language code */
  language?: string;
  /** Theme color */
  themeColor?: string;
}

// ============================================================================
// SEO Generation Functions
// ============================================================================

/**
 * Generate meta tags from SEO configuration
 * @returns Array of meta element nodes
 */
export function generateMeta(config: SEOConfig): CoherentNode[];

/**
 * Generate JSON-LD script tag from data
 */
export function generateJsonLd(data: Record<string, unknown>): CoherentNode;

/**
 * Create a reusable SEO component from configuration
 */
export function createSEOComponent(config: SEOConfig): () => CoherentNode;

/**
 * Merge multiple SEO configurations (later configs override earlier)
 */
export function mergeSEOConfig(...configs: Partial<SEOConfig>[]): SEOConfig;

// ============================================================================
// Meta Builder
// ============================================================================

/**
 * All meta tags in a flat structure
 */
export interface MetaTags {
  title?: string;
  description?: string;
  keywords?: string | string[];
  author?: string;
  robots?: string;
  canonical?: string;
  viewport?: string;
  charset?: string;
  language?: string;
  themeColor?: string;
  // Open Graph
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  ogSiteName?: string;
  ogLocale?: string;
  // Twitter Card
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  // Custom meta tags
  [key: string]: unknown;
}

/**
 * Fluent builder for meta tags
 */
export class MetaBuilder {
  constructor(tags?: MetaTags);

  /** Set page title */
  setTitle(title: string): this;

  /** Set page description */
  setDescription(description: string): this;

  /** Set keywords */
  setKeywords(keywords: string | string[]): this;

  /** Set author */
  setAuthor(author: string): this;

  /** Set robots directive */
  setRobots(robots: string): this;

  /** Set canonical URL */
  setCanonical(url: string): this;

  /** Set viewport */
  setViewport(viewport: string): this;

  /** Set Open Graph properties */
  setOpenGraph(tags: Partial<OpenGraphMeta>): this;

  /** Set Twitter Card properties */
  setTwitterCard(tags: Partial<TwitterMeta>): this;

  /** Add a custom meta tag */
  addCustomTag(name: string, content: string, type?: 'name' | 'property'): this;

  /** Build as CoherentNode */
  build(): CoherentNode;

  /** Alias for build */
  render(): CoherentNode;

  /** Convert to HTML string */
  toHTML(): string;
}

/**
 * Create a MetaBuilder instance
 */
export function createMetaBuilder(tags?: MetaTags): MetaBuilder;

/**
 * Generate meta nodes from flat tags
 */
export function generateMeta(tags: MetaTags): CoherentNode;

// ============================================================================
// Sitemap Generator
// ============================================================================

/**
 * Sitemap entry configuration
 */
export interface SitemapEntry {
  /** Page URL */
  url: string;
  /** Last modification date */
  lastmod?: string | Date;
  /** Change frequency */
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  /** Priority (0.0 to 1.0) */
  priority?: number;
  /** Image entries */
  images?: Array<{
    loc: string;
    title?: string;
    caption?: string;
  }>;
  /** Video entries */
  videos?: Array<{
    thumbnail_loc: string;
    title: string;
    description: string;
    content_loc?: string;
    player_loc?: string;
  }>;
  /** Alternate language versions */
  alternates?: Array<{
    hreflang: string;
    href: string;
  }>;
}

/**
 * Sitemap generator options
 */
export interface SitemapOptions {
  /** Site hostname (e.g., 'https://example.com') */
  hostname: string;
  /** Cache time in milliseconds */
  cacheTime?: number;
  /** XML namespaces */
  xmlNs?: Record<string, string>;
  /** XSL stylesheet URL */
  xslUrl?: string;
}

/**
 * Sitemap generator class
 */
export class SitemapGenerator {
  constructor(options: SitemapOptions);

  /** Add a URL entry */
  addUrl(entry: SitemapEntry): this;

  /** Add multiple URL entries */
  addUrls(entries: SitemapEntry[]): this;

  /** Remove a URL entry */
  removeUrl(url: string): this;

  /** Generate sitemap XML string */
  generate(): string;

  /** Alias for generate */
  toXML(): string;

  /** Export entries as JSON */
  toJSON(): SitemapEntry[];
}

/**
 * Create a sitemap generator
 */
export function createSitemapGenerator(options: SitemapOptions): SitemapGenerator;

/**
 * Generate sitemap XML from entries
 */
export function generateSitemap(entries: SitemapEntry[], options: SitemapOptions): string;

// ============================================================================
// Structured Data (JSON-LD)
// ============================================================================

/**
 * Supported structured data types
 */
export type StructuredDataType =
  | 'Article'
  | 'BlogPosting'
  | 'NewsArticle'
  | 'WebPage'
  | 'WebSite'
  | 'Organization'
  | 'Person'
  | 'Product'
  | 'Review'
  | 'Event'
  | 'Recipe'
  | 'BreadcrumbList'
  | 'LocalBusiness'
  | 'FAQPage'
  | 'HowTo'
  | 'VideoObject'
  | 'ImageObject'
  | 'SoftwareApplication'
  | 'Course'
  | 'JobPosting';

/**
 * Structured data object
 */
export interface StructuredData {
  '@context': string;
  '@type': StructuredDataType | StructuredDataType[];
  [key: string]: unknown;
}

/**
 * Fluent builder for structured data
 */
export class StructuredDataBuilder {
  constructor(type: StructuredDataType);

  /** Change the schema type */
  setType(type: StructuredDataType): this;

  /** Set a single property */
  setProperty(key: string, value: unknown): this;

  /** Set multiple properties */
  setProperties(properties: Record<string, unknown>): this;

  /** Add value to an array property */
  addToArray(key: string, value: unknown): this;

  /** Build the structured data object */
  build(): StructuredData;

  /** Convert to JSON string */
  toJSON(): string;

  /** Build as JSON-LD script node */
  toJSONLD(): CoherentNode;
}

/**
 * Create a structured data builder
 */
export function createStructuredData(
  type: StructuredDataType,
  properties?: Record<string, unknown>
): StructuredDataBuilder;

/**
 * Generate structured data object
 */
export function generateStructuredData(
  type: StructuredDataType,
  properties: Record<string, unknown>
): StructuredData;

// ============================================================================
// Common Structured Data Types
// ============================================================================

/**
 * Article structured data
 */
export interface ArticleData {
  headline: string;
  image: string | string[];
  datePublished: string;
  dateModified?: string;
  author: {
    '@type': 'Person' | 'Organization';
    name: string;
  };
  publisher: {
    '@type': 'Organization';
    name: string;
    logo: {
      '@type': 'ImageObject';
      url: string;
    };
  };
  description?: string;
  mainEntityOfPage?: string;
}

/**
 * Product structured data
 */
export interface ProductData {
  name: string;
  image: string | string[];
  description: string;
  brand?: {
    '@type': 'Brand';
    name: string;
  };
  offers?: {
    '@type': 'Offer';
    price: number;
    priceCurrency: string;
    availability?: string;
    url?: string;
  };
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: number;
    reviewCount: number;
  };
}

/**
 * Breadcrumb structured data
 */
export interface BreadcrumbData {
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item?: string;
  }>;
}

/**
 * Organization structured data
 */
export interface OrganizationData {
  name: string;
  url?: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
  contactPoint?: {
    '@type': 'ContactPoint';
    telephone: string;
    contactType: string;
  };
}

/**
 * FAQ Page structured data
 */
export interface FAQPageData {
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }>;
}
