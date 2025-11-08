/**
 * Coherent.js Database Types
 * TypeScript definitions for the database integration layer
 *
 * @version 1.0.0-beta.1
 */

// ============================================================================
// Database Connection Types
// ============================================================================

/** Database configuration options */
export interface DatabaseConfig {
  type: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'memory';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  synchronize?: boolean;
  logging?: boolean | ((sql: string, parameters?: any[]) => void);
  entities?: any[];
  migrations?: any[];
  subscribers?: any[];
  ssl?: boolean | object;
  extra?: object;
  autoConnect?: boolean;
  connectionTimeout?: number;
  acquireTimeout?: number;
  timeout?: number;
  timezone?: string;
  charset?: string;
  pool?: PoolConfig;
}

/** Database connection pool configuration */
export interface PoolConfig {
  min?: number;
  max?: number;
  acquire?: number;
  idle?: number;
  evict?: number;
  handleDisconnects?: boolean;
}

/** Database connection interface */
export interface DatabaseConnection {
  readonly isConnected: boolean;
  readonly config: DatabaseConfig;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query<T = any>(sql: string, parameters?: any[]): Promise<T>;
  transaction<T>(callback: (trx: Transaction) => Promise<T>): Promise<T>;
  raw<T = any>(sql: string, bindings?: any[]): Promise<T>;
  destroy(): Promise<void>;
  ping(): Promise<boolean>;
}

/** Database transaction interface */
export interface Transaction {
  query<T = any>(sql: string, parameters?: any[]): Promise<T>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  savepoint(name: string): Promise<void>;
  release(name: string): Promise<void>;
  rollbackTo(name: string): Promise<void>;
}

/** Database manager interface */
export interface DatabaseManager {
  readonly connections: Map<string, DatabaseConnection>;
  readonly config: DatabaseConfig;
  initialized: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnection(name?: string): DatabaseConnection;
  addConnection(name: string, connection: DatabaseConnection): void;
  removeConnection(name: string): Promise<void>;
  transaction<T>(callback: (trx: Transaction) => Promise<T>, connectionName?: string): Promise<T>;
  destroy(): Promise<void>;
}

// ============================================================================
// Query Builder Types
// ============================================================================

/** SQL operators for where conditions */
export type SqlOperator =
  | '=' | '!=' | '<>' | '>' | '>=' | '<' | '<='
  | 'LIKE' | 'NOT LIKE' | 'ILIKE' | 'NOT ILIKE'
  | 'IN' | 'NOT IN' | 'BETWEEN' | 'NOT BETWEEN'
  | 'IS NULL' | 'IS NOT NULL'
  | 'EXISTS' | 'NOT EXISTS'
  | 'REGEXP' | 'NOT REGEXP';

/** Where condition value */
export type WhereValue =
  | string | number | boolean | Date | null
  | any[]
  | { [K in SqlOperator]?: any }
  | QueryConfig;

/** Where conditions object */
export interface WhereConditions {
  [column: string]: WhereValue | WhereConditions;
  AND?: WhereConditions | WhereConditions[];
  OR?: WhereConditions | WhereConditions[];
  NOT?: WhereConditions;
}

/** Order by direction */
export type OrderDirection = 'ASC' | 'DESC' | 'asc' | 'desc';

/** Order by configuration */
export interface OrderByConfig {
  [column: string]: OrderDirection;
}

/** Join types */
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';

/** Join configuration */
export interface JoinConfig {
  type?: JoinType;
  table: string;
  on: string | WhereConditions;
  alias?: string;
}

/** Group by configuration */
export type GroupByConfig = string | string[];

/** Having conditions */
export interface HavingConditions extends WhereConditions {}

/** Query configuration object */
export interface QueryConfig {
  table?: string;
  alias?: string;
  select?: string | string[] | SelectConfig;
  distinct?: boolean;
  where?: WhereConditions;
  join?: JoinConfig | JoinConfig[];
  leftJoin?: JoinConfig | JoinConfig[];
  rightJoin?: JoinConfig | JoinConfig[];
  innerJoin?: JoinConfig | JoinConfig[];
  fullJoin?: JoinConfig | JoinConfig[];
  groupBy?: GroupByConfig;
  having?: HavingConditions;
  orderBy?: string | string[] | OrderByConfig;
  limit?: number;
  offset?: number;
  insert?: Record<string, any> | Record<string, any>[];
  update?: Record<string, any>;
  upsert?: Record<string, any>;
  delete?: boolean;
  returning?: string | string[];
  with?: WithConfig | WithConfig[];
  union?: QueryConfig[];
  unionAll?: QueryConfig[];
  forUpdate?: boolean;
  forShare?: boolean;
  skipLocked?: boolean;
  noWait?: boolean;
}

/** Select configuration with column aliasing */
export interface SelectConfig {
  [alias: string]: string;
}

/** WITH clause configuration for CTEs */
export interface WithConfig {
  name: string;
  query: QueryConfig;
  recursive?: boolean;
}

/** SQL query result */
export interface QueryResult<T = any> {
  sql: string;
  params: any[];
  result?: T;
  rows?: T[];
  rowCount?: number;
  fields?: FieldInfo[];
  insertId?: number | string;
  affectedRows?: number;
  changedRows?: number;
}

/** Field information */
export interface FieldInfo {
  name: string;
  type: string;
  nullable: boolean;
  default?: any;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

// ============================================================================
// Model Types
// ============================================================================

/** Model field definition */
export interface FieldDefinition {
  type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array' | 'object';
  required?: boolean;
  default?: any;
  primaryKey?: boolean;
  unique?: boolean;
  index?: boolean;
  nullable?: boolean;
  length?: number;
  precision?: number;
  scale?: number;
  enum?: any[];
  validate?: (value: any) => boolean | string;
  transform?: (value: any) => any;
  serialize?: (value: any) => any;
  deserialize?: (value: any) => any;
  relation?: RelationDefinition;
  foreignKey?: string;
  references?: { table: string; column: string };
}

/** Model schema definition */
export interface ModelSchema {
  [field: string]: FieldDefinition;
}

/** Relation types */
export type RelationType = 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';

/** Relation definition */
export interface RelationDefinition {
  type: RelationType;
  model: string;
  foreignKey?: string;
  localKey?: string;
  pivotTable?: string;
  pivotForeignKey?: string;
  pivotRelatedKey?: string;
  through?: string;
  as?: string;
}

/** Model configuration */
export interface ModelConfig {
  table: string;
  schema: ModelSchema;
  timestamps?: boolean | { created?: string; updated?: string };
  softDeletes?: boolean | string;
  primaryKey?: string;
  fillable?: string[];
  guarded?: string[];
  hidden?: string[];
  visible?: string[];
  casts?: Record<string, string>;
  relations?: Record<string, RelationDefinition>;
  hooks?: ModelHooks;
  validators?: Record<string, (value: any, instance: ModelInstance) => boolean | string>;
}

/** Model lifecycle hooks */
export interface ModelHooks {
  beforeSave?: (instance: ModelInstance) => void | Promise<void>;
  afterSave?: (instance: ModelInstance) => void | Promise<void>;
  beforeCreate?: (instance: ModelInstance) => void | Promise<void>;
  afterCreate?: (instance: ModelInstance) => void | Promise<void>;
  beforeUpdate?: (instance: ModelInstance) => void | Promise<void>;
  afterUpdate?: (instance: ModelInstance) => void | Promise<void>;
  beforeDelete?: (instance: ModelInstance) => void | Promise<void>;
  afterDelete?: (instance: ModelInstance) => void | Promise<void>;
  beforeValidate?: (instance: ModelInstance) => void | Promise<void>;
  afterValidate?: (instance: ModelInstance) => void | Promise<void>;
}

/** Model instance interface */
export interface ModelInstance {
  readonly $model: Model;
  readonly $table: string;
  readonly $primaryKey: string;
  readonly $exists: boolean;
  readonly $dirty: boolean;
  readonly $original: Record<string, any>;
  readonly $attributes: Record<string, any>;
  readonly $relations: Record<string, any>;

  get<K extends keyof this>(key: K): this[K];
  set<K extends keyof this>(key: K, value: this[K]): this;
  setAttribute(key: string, value: any): this;
  getAttribute(key: string): any;
  hasAttribute(key: string): boolean;
  fill(attributes: Record<string, any>): this;
  save(): Promise<this>;
  update(attributes: Record<string, any>): Promise<this>;
  delete(): Promise<boolean>;
  refresh(): Promise<this>;
  validate(): Promise<boolean>;
  getValidationErrors(): string[];
  toObject(): Record<string, any>;
  toJSON(): Record<string, any>;
  clone(): ModelInstance;
  is(instance: ModelInstance): boolean;
  isNot(instance: ModelInstance): boolean;
  getKey(): any;
  setKey(value: any): this;
  getDirty(): Record<string, any>;
  getOriginal(): Record<string, any>;
  syncOriginal(): this;
  wasChanged(key?: string): boolean;
  getChanges(): Record<string, any>;
  load(relations: string | string[]): Promise<this>;
  loadMissing(relations: string | string[]): Promise<this>;
}

/** Model query builder interface */
export interface ModelQuery<T extends ModelInstance = ModelInstance> {
  readonly model: Model;

  find(id: any): Promise<T | null>;
  findOrFail(id: any): Promise<T>;
  findMany(ids: any[]): Promise<T[]>;
  first(): Promise<T | null>;
  firstOrFail(): Promise<T>;
  get(): Promise<T[]>;
  all(): Promise<T[]>;
  count(): Promise<number>;
  exists(): Promise<boolean>;
  sum(column: string): Promise<number>;
  avg(column: string): Promise<number>;
  min(column: string): Promise<number>;
  max(column: string): Promise<number>;

  where(conditions: WhereConditions): ModelQuery<T>;
  where(column: string, value: any): ModelQuery<T>;
  where(column: string, operator: SqlOperator, value: any): ModelQuery<T>;
  whereIn(column: string, values: any[]): ModelQuery<T>;
  whereNotIn(column: string, values: any[]): ModelQuery<T>;
  whereBetween(column: string, values: [any, any]): ModelQuery<T>;
  whereNull(column: string): ModelQuery<T>;
  whereNotNull(column: string): ModelQuery<T>;

  orderBy(column: string, direction?: OrderDirection): ModelQuery<T>;
  orderByDesc(column: string): ModelQuery<T>;
  latest(column?: string): ModelQuery<T>;
  oldest(column?: string): ModelQuery<T>;

  limit(count: number): ModelQuery<T>;
  take(count: number): ModelQuery<T>;
  offset(count: number): ModelQuery<T>;
  skip(count: number): ModelQuery<T>;

  with(relations: string | string[]): ModelQuery<T>;
  withCount(relations: string | string[]): ModelQuery<T>;
  has(relation: string, operator?: string, count?: number): ModelQuery<T>;
  whereHas(relation: string, callback?: (query: ModelQuery) => void): ModelQuery<T>;
  doesntHave(relation: string): ModelQuery<T>;
  whereDoesntHave(relation: string, callback?: (query: ModelQuery) => void): ModelQuery<T>;

  create(attributes: Record<string, any>): Promise<T>;
  insert(records: Record<string, any>[]): Promise<void>;
  update(attributes: Record<string, any>): Promise<number>;
  delete(): Promise<number>;
  forceDelete(): Promise<number>;

  paginate(page: number, perPage: number): Promise<PaginationResult<T>>;
  simplePaginate(page: number, perPage: number): Promise<SimplePaginationResult<T>>;

  chunk(size: number, callback: (items: T[]) => void | Promise<void>): Promise<void>;
  each(callback: (item: T) => void | Promise<void>): Promise<void>;

  toSql(): string;
  explain(): Promise<any[]>;

  clone(): ModelQuery<T>;
}

/** Model class interface */
export interface Model {
  readonly table: string;
  readonly primaryKey: string;
  readonly schema: ModelSchema;
  readonly config: ModelConfig;
  readonly connection: DatabaseConnection;

  query(): ModelQuery;
  newInstance(attributes?: Record<string, any>, exists?: boolean): ModelInstance;
  create(attributes: Record<string, any>): Promise<ModelInstance>;
  find(id: any): Promise<ModelInstance | null>;
  findOrFail(id: any): Promise<ModelInstance>;
  findMany(ids: any[]): Promise<ModelInstance[]>;
  first(): Promise<ModelInstance | null>;
  firstOrFail(): Promise<ModelInstance>;
  all(): Promise<ModelInstance[]>;
  where(conditions: WhereConditions): ModelQuery;
  insert(records: Record<string, any>[]): Promise<void>;
  update(attributes: Record<string, any>, conditions?: WhereConditions): Promise<number>;
  delete(conditions?: WhereConditions): Promise<number>;
  count(conditions?: WhereConditions): Promise<number>;

  validateSchema(): boolean;
  getTableName(): string;
  getPrimaryKey(): string;
  getSchema(): ModelSchema;
  getRelations(): Record<string, RelationDefinition>;

  on(event: string, listener: (...args: any[]) => void): Model;
  off(event: string, listener?: (...args: any[]) => void): Model;
  emit(event: string, ...args: any[]): boolean;
}

/** Pagination result */
export interface PaginationResult<T> {
  data: T[];
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  from: number;
  to: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Simple pagination result */
export interface SimplePaginationResult<T> {
  data: T[];
  perPage: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ============================================================================
// Migration Types
// ============================================================================

/** Migration configuration */
export interface MigrationConfig {
  name: string;
  version: string;
  description?: string;
  up: (schema: SchemaBuilder) => Promise<void> | void;
  down: (schema: SchemaBuilder) => Promise<void> | void;
  dependencies?: string[];
}

/** Schema builder for migrations */
export interface SchemaBuilder {
  createTable(name: string, callback: (table: TableBuilder) => void): void;
  alterTable(name: string, callback: (table: TableBuilder) => void): void;
  dropTable(name: string): void;
  dropTableIfExists(name: string): void;
  renameTable(oldName: string, newName: string): void;
  hasTable(name: string): Promise<boolean>;
  createIndex(table: string, columns: string | string[], options?: IndexOptions): void;
  dropIndex(table: string, indexName: string): void;
  raw(sql: string): void;
}

/** Table builder for schema modifications */
export interface TableBuilder {
  increments(name?: string): ColumnBuilder;
  string(name: string, length?: number): ColumnBuilder;
  text(name: string): ColumnBuilder;
  integer(name: string): ColumnBuilder;
  bigInteger(name: string): ColumnBuilder;
  float(name: string, precision?: number, scale?: number): ColumnBuilder;
  decimal(name: string, precision?: number, scale?: number): ColumnBuilder;
  boolean(name: string): ColumnBuilder;
  date(name: string): ColumnBuilder;
  datetime(name: string): ColumnBuilder;
  timestamp(name: string): ColumnBuilder;
  timestamps(useTimestamps?: boolean, defaultToNow?: boolean): void;
  json(name: string): ColumnBuilder;
  jsonb(name: string): ColumnBuilder;
  uuid(name: string): ColumnBuilder;
  enum(name: string, values: string[]): ColumnBuilder;

  primary(columns: string | string[]): void;
  index(columns: string | string[], options?: IndexOptions): void;
  unique(columns: string | string[], options?: IndexOptions): void;
  foreign(columns: string | string[]): ForeignKeyBuilder;

  dropColumn(name: string): void;
  dropColumns(...names: string[]): void;
  renameColumn(oldName: string, newName: string): void;
  dropPrimary(): void;
  dropIndex(indexName: string): void;
  dropUnique(indexName: string): void;
  dropForeign(keyName: string): void;

  comment(text: string): void;
  engine(engine: string): void;
  charset(charset: string): void;
  collate(collation: string): void;
}

/** Column builder for schema modifications */
export interface ColumnBuilder {
  nullable(isNullable?: boolean): ColumnBuilder;
  notNullable(): ColumnBuilder;
  defaultTo(value: any): ColumnBuilder;
  unsigned(): ColumnBuilder;
  primary(): ColumnBuilder;
  unique(indexName?: string): ColumnBuilder;
  index(indexName?: string): ColumnBuilder;
  references(column: string): ForeignKeyBuilder;
  comment(text: string): ColumnBuilder;
  alter(): ColumnBuilder;
  after(columnName: string): ColumnBuilder;
  first(): ColumnBuilder;
}

/** Foreign key builder */
export interface ForeignKeyBuilder {
  references(column: string): ForeignKeyBuilder;
  inTable(table: string): ForeignKeyBuilder;
  onDelete(action: ForeignKeyAction): ForeignKeyBuilder;
  onUpdate(action: ForeignKeyAction): ForeignKeyBuilder;
  deferrable(type?: 'not deferrable' | 'immediate' | 'deferred'): ForeignKeyBuilder;
}

/** Foreign key actions */
export type ForeignKeyAction = 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';

/** Index options */
export interface IndexOptions {
  indexName?: string;
  indexType?: 'btree' | 'hash' | 'gist' | 'gin' | 'spgist';
  storageParameters?: Record<string, any>;
}

/** Migration interface */
export interface Migration {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly config: MigrationConfig;

  up(): Promise<void>;
  down(): Promise<void>;
  validate(): boolean;
  getDependencies(): string[];
}

// ============================================================================
// Database Adapter Types
// ============================================================================

/** Database adapter interface */
export interface DatabaseAdapter {
  readonly type: string;
  readonly connection: DatabaseConnection;

  connect(config: DatabaseConfig): Promise<DatabaseConnection>;
  disconnect(): Promise<void>;
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  beginTransaction(): Promise<Transaction>;
  escapeIdentifier(identifier: string): string;
  escapeValue(value: any): string;
  formatSQL(sql: string, params?: any[]): string;
  getSchemaBuilder(): SchemaBuilder;
  supportsFeature(feature: DatabaseFeature): boolean;
}

/** Database features */
export type DatabaseFeature =
  | 'transactions'
  | 'savepoints'
  | 'foreignKeys'
  | 'json'
  | 'arrays'
  | 'cte'
  | 'window'
  | 'upsert'
  | 'returning';

// ============================================================================
// Middleware Types
// ============================================================================

/** Database middleware options */
export interface DatabaseMiddlewareOptions {
  connection?: string;
  transaction?: boolean;
  readonly?: boolean;
  timeout?: number;
}

/** Transaction middleware options */
export interface TransactionMiddlewareOptions {
  connection?: string;
  isolation?: TransactionIsolation;
  readonly?: boolean;
  deferrable?: boolean;
}

/** Transaction isolation levels */
export type TransactionIsolation =
  | 'READ UNCOMMITTED'
  | 'READ COMMITTED'
  | 'REPEATABLE READ'
  | 'SERIALIZABLE';

/** Model middleware options */
export interface ModelMiddlewareOptions {
  model: string | Model;
  connection?: string;
  as?: string;
}

/** Pagination middleware options */
export interface PaginationMiddlewareOptions {
  defaultPerPage?: number;
  maxPerPage?: number;
  pageKey?: string;
  perPageKey?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/** Connection string parser result */
export interface ConnectionInfo {
  type: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  options?: Record<string, any>;
}

/** Migration status */
export interface MigrationStatus {
  name: string;
  version: string;
  executed: boolean;
  executedAt?: Date;
  executionTime?: number;
  error?: string;
}

// ============================================================================
// Main Functions
// ============================================================================

/** Create a query configuration object */
export function createQuery(config: QueryConfig): QueryConfig;

/** Execute a query using the provided configuration */
export function executeQuery<T = any>(db: DatabaseConnection, query: QueryConfig): Promise<QueryResult<T>>;

/** Create a model */
export function createModel(config: ModelConfig): Model;

/** Create a migration */
export function createMigration(config: MigrationConfig): Migration;

/** Create a database manager */
export function createDatabaseManager(config: DatabaseConfig): DatabaseManager;

/** Create a connection */
export function createConnection(config: DatabaseConfig): Promise<DatabaseConnection>;

/** Run migrations */
export function runMigrations(
  connection: DatabaseConnection,
  migrations: Migration[],
  options?: { target?: string }
): Promise<MigrationStatus[]>;

/** Database adapter creators */
export function createPostgreSQLAdapter(config: DatabaseConfig): DatabaseAdapter;
export function createMySQLAdapter(config: DatabaseConfig): DatabaseAdapter;
export function createSQLiteAdapter(config: DatabaseConfig): DatabaseAdapter;
export function createMongoDBAdapter(config: DatabaseConfig): DatabaseAdapter;

/** Middleware functions */
export function withDatabase(options?: DatabaseMiddlewareOptions): any;
export function withTransaction(options?: TransactionMiddlewareOptions): any;
export function withModel(options: ModelMiddlewareOptions): any;
export function withPagination(options?: PaginationMiddlewareOptions): any;

/** Setup database with default configuration */
export function setupDatabase(config?: Partial<DatabaseConfig>): DatabaseManager;

/** Default database configuration */
export const DEFAULT_DB_CONFIG: DatabaseConfig;

// ============================================================================
// Adapter Exports
// ============================================================================

export const PostgreSQLAdapter: typeof createPostgreSQLAdapter;
export const MySQLAdapter: typeof createMySQLAdapter;
export const SQLiteAdapter: typeof createSQLiteAdapter;
export const MongoDBAdapter: typeof createMongoDBAdapter;

// ============================================================================
// Default Export
// ============================================================================

declare const coherentDatabase: {
  createQuery: typeof createQuery;
  executeQuery: typeof executeQuery;
  createModel: typeof createModel;
  createMigration: typeof createMigration;
  createDatabaseManager: typeof createDatabaseManager;
  withDatabase: typeof withDatabase;
  withTransaction: typeof withTransaction;
  withModel: typeof withModel;
  withPagination: typeof withPagination;
  PostgreSQLAdapter: typeof PostgreSQLAdapter;
  MySQLAdapter: typeof MySQLAdapter;
  SQLiteAdapter: typeof SQLiteAdapter;
  MongoDBAdapter: typeof MongoDBAdapter;
  createConnection: typeof createConnection;
  runMigrations: typeof runMigrations;
  setupDatabase: typeof setupDatabase;
  DEFAULT_DB_CONFIG: typeof DEFAULT_DB_CONFIG;
};

export default coherentDatabase;
