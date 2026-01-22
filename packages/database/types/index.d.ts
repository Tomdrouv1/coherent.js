/**
 * Coherent.js Database Types
 * TypeScript definitions for the database integration layer
 *
 * @version 1.0.0-beta.1
 */

// ============================================================================
// Database Connection Types
// ============================================================================

/**
 * Database type identifier.
 */
export type DatabaseType = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'memory';

/**
 * PostgreSQL-specific configuration options.
 */
export interface PostgreSQLConfig {
  type: 'postgresql';
  host: string;
  port?: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean | {
    rejectUnauthorized?: boolean;
    ca?: string;
    key?: string;
    cert?: string;
  };
  schema?: string;
  applicationName?: string;
  statementTimeout?: number;
  idleTimeout?: number;
}

/**
 * MySQL-specific configuration options.
 */
export interface MySQLConfig {
  type: 'mysql';
  host: string;
  port?: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean | {
    ca?: string;
    key?: string;
    cert?: string;
  };
  multipleStatements?: boolean;
  namedPlaceholders?: boolean;
  dateStrings?: boolean;
  supportBigNumbers?: boolean;
  bigNumberStrings?: boolean;
}

/**
 * SQLite-specific configuration options.
 */
export interface SQLiteConfig {
  type: 'sqlite';
  database: string;
  mode?: 'readonly' | 'readwrite' | 'create';
  wal?: boolean;
  busyTimeout?: number;
}

/**
 * MongoDB-specific configuration options.
 */
export interface MongoDBConfig {
  type: 'mongodb';
  uri?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database: string;
  authSource?: string;
  replicaSet?: string;
  retryWrites?: boolean;
  w?: number | 'majority';
}

/**
 * In-memory database configuration for testing.
 */
export interface MemoryConfig {
  type: 'memory';
  database?: string;
}

/**
 * Database-specific configuration union type.
 */
export type DatabaseSpecificConfig =
  | PostgreSQLConfig
  | MySQLConfig
  | SQLiteConfig
  | MongoDBConfig
  | MemoryConfig;

/** Database configuration options */
export interface DatabaseConfig {
  type: DatabaseType;
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

/**
 * Database transaction interface.
 * Supports nested transactions via savepoints.
 */
export interface Transaction {
  query<T = any>(sql: string, parameters?: any[]): Promise<T>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  /** Create a savepoint for nested transaction */
  savepoint(name: string): Promise<void>;
  /** Release a savepoint */
  release(name: string): Promise<void>;
  /** Rollback to a savepoint */
  rollbackTo(name: string): Promise<void>;
  /** Whether transaction is still active */
  readonly isActive: boolean;
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

/**
 * Field type definitions for model schema.
 */
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array' | 'object' | 'uuid' | 'bigint' | 'decimal';

/** Model field definition */
export interface FieldDefinition {
  type: FieldType;
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
export interface ModelConfig<T extends Record<string, any> = Record<string, any>> {
  table: string;
  schema: ModelSchema;
  timestamps?: boolean | { created?: string; updated?: string };
  softDeletes?: boolean | string;
  primaryKey?: string;
  fillable?: (keyof T)[];
  guarded?: (keyof T)[];
  hidden?: (keyof T)[];
  visible?: (keyof T)[];
  casts?: Record<keyof T, string>;
  relations?: Record<string, RelationDefinition>;
  hooks?: ModelHooks<T>;
  validators?: Record<string, (value: any, instance: ModelInstance<T>) => boolean | string>;
}

/** Model lifecycle hooks */
export interface ModelHooks<T extends Record<string, any> = Record<string, any>> {
  beforeSave?: (instance: ModelInstance<T>) => void | Promise<void>;
  afterSave?: (instance: ModelInstance<T>) => void | Promise<void>;
  beforeCreate?: (instance: ModelInstance<T>) => void | Promise<void>;
  afterCreate?: (instance: ModelInstance<T>) => void | Promise<void>;
  beforeUpdate?: (instance: ModelInstance<T>) => void | Promise<void>;
  afterUpdate?: (instance: ModelInstance<T>) => void | Promise<void>;
  beforeDelete?: (instance: ModelInstance<T>) => void | Promise<void>;
  afterDelete?: (instance: ModelInstance<T>) => void | Promise<void>;
  beforeValidate?: (instance: ModelInstance<T>) => void | Promise<void>;
  afterValidate?: (instance: ModelInstance<T>) => void | Promise<void>;
}

/**
 * Model instance interface with generic type support.
 * Type parameter T represents the model's attribute shape.
 */
export interface ModelInstance<T extends Record<string, any> = Record<string, any>> {
  readonly $model: Model<T>;
  readonly $table: string;
  readonly $primaryKey: string;
  readonly $exists: boolean;
  readonly $dirty: boolean;
  readonly $original: T;
  readonly $attributes: T;
  readonly $relations: Record<string, any>;

  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K]): this;
  setAttribute<K extends keyof T>(key: K, value: T[K]): this;
  getAttribute<K extends keyof T>(key: K): T[K];
  hasAttribute(key: string): boolean;
  fill(attributes: Partial<T>): this;
  save(): Promise<this>;
  update(attributes: Partial<T>): Promise<this>;
  delete(): Promise<boolean>;
  refresh(): Promise<this>;
  validate(): Promise<boolean>;
  getValidationErrors(): string[];
  toObject(): T;
  toJSON(): T;
  clone(): ModelInstance<T>;
  is(instance: ModelInstance<T>): boolean;
  isNot(instance: ModelInstance<T>): boolean;
  getKey(): T[keyof T];
  setKey(value: T[keyof T]): this;
  getDirty(): Partial<T>;
  getOriginal(): T;
  syncOriginal(): this;
  wasChanged(key?: keyof T): boolean;
  getChanges(): Partial<T>;
  load(relations: string | string[]): Promise<this>;
  loadMissing(relations: string | string[]): Promise<this>;
}

/**
 * Model query builder interface with full generic chaining.
 * Type parameter T flows through all query methods to the results.
 *
 * @example
 * ```typescript
 * interface User {
 *   id: number;
 *   email: string;
 *   name: string;
 *   createdAt: Date;
 * }
 *
 * const userModel = createModel<User>({ table: 'users', ... });
 *
 * // Type-safe query chain
 * const users = await userModel.query()
 *   .where({ email: 'test@example.com' })
 *   .orderBy('createdAt', 'DESC')
 *   .limit(10)
 *   .get(); // users: ModelInstance<User>[]
 * ```
 */
export interface ModelQuery<T extends Record<string, any> = Record<string, any>> {
  readonly model: Model<T>;

  find(id: any): Promise<ModelInstance<T> | null>;
  findOrFail(id: any): Promise<ModelInstance<T>>;
  findMany(ids: any[]): Promise<ModelInstance<T>[]>;
  first(): Promise<ModelInstance<T> | null>;
  firstOrFail(): Promise<ModelInstance<T>>;
  get(): Promise<ModelInstance<T>[]>;
  all(): Promise<ModelInstance<T>[]>;
  count(): Promise<number>;
  exists(): Promise<boolean>;
  sum(column: keyof T & string): Promise<number>;
  avg(column: keyof T & string): Promise<number>;
  min(column: keyof T & string): Promise<number>;
  max(column: keyof T & string): Promise<number>;

  where(conditions: Partial<T> | WhereConditions): ModelQuery<T>;
  where<K extends keyof T>(column: K, value: T[K]): ModelQuery<T>;
  where<K extends keyof T>(column: K, operator: SqlOperator, value: T[K]): ModelQuery<T>;
  whereIn<K extends keyof T>(column: K, values: T[K][]): ModelQuery<T>;
  whereNotIn<K extends keyof T>(column: K, values: T[K][]): ModelQuery<T>;
  whereBetween<K extends keyof T>(column: K, values: [T[K], T[K]]): ModelQuery<T>;
  whereNull(column: keyof T & string): ModelQuery<T>;
  whereNotNull(column: keyof T & string): ModelQuery<T>;

  orderBy(column: keyof T & string, direction?: OrderDirection): ModelQuery<T>;
  orderByDesc(column: keyof T & string): ModelQuery<T>;
  latest(column?: keyof T & string): ModelQuery<T>;
  oldest(column?: keyof T & string): ModelQuery<T>;

  limit(count: number): ModelQuery<T>;
  take(count: number): ModelQuery<T>;
  offset(count: number): ModelQuery<T>;
  skip(count: number): ModelQuery<T>;

  with(relations: string | string[]): ModelQuery<T>;
  withCount(relations: string | string[]): ModelQuery<T>;
  has(relation: string, operator?: string, count?: number): ModelQuery<T>;
  whereHas(relation: string, callback?: (query: ModelQuery<any>) => void): ModelQuery<T>;
  doesntHave(relation: string): ModelQuery<T>;
  whereDoesntHave(relation: string, callback?: (query: ModelQuery<any>) => void): ModelQuery<T>;

  /** Select specific columns */
  select<K extends keyof T>(...columns: K[]): ModelQuery<Pick<T, K>>;

  create(attributes: Partial<T>): Promise<ModelInstance<T>>;
  insert(records: Partial<T>[]): Promise<void>;
  update(attributes: Partial<T>): Promise<number>;
  delete(): Promise<number>;
  forceDelete(): Promise<number>;

  paginate(page: number, perPage: number): Promise<PaginationResult<T>>;
  simplePaginate(page: number, perPage: number): Promise<SimplePaginationResult<T>>;

  chunk(size: number, callback: (items: ModelInstance<T>[]) => void | Promise<void>): Promise<void>;
  each(callback: (item: ModelInstance<T>) => void | Promise<void>): Promise<void>;

  toSql(): string;
  explain(): Promise<any[]>;

  clone(): ModelQuery<T>;
}

/**
 * Model class interface with generic type support.
 *
 * @example
 * ```typescript
 * interface User {
 *   id: number;
 *   email: string;
 *   name: string;
 * }
 *
 * const User: Model<User> = createModel<User>({
 *   table: 'users',
 *   schema: {
 *     id: { type: 'number', primaryKey: true },
 *     email: { type: 'string', unique: true },
 *     name: { type: 'string' }
 *   }
 * });
 *
 * // Type-safe operations
 * const user = await User.create({ email: 'test@example.com', name: 'Test' });
 * const found = await User.find(1);
 * ```
 */
export interface Model<T extends Record<string, any> = Record<string, any>> {
  readonly table: string;
  readonly primaryKey: string;
  readonly schema: ModelSchema;
  readonly config: ModelConfig<T>;
  readonly connection: DatabaseConnection;

  query(): ModelQuery<T>;
  newInstance(attributes?: Partial<T>, exists?: boolean): ModelInstance<T>;
  create(attributes: Partial<T>): Promise<ModelInstance<T>>;
  find(id: any): Promise<ModelInstance<T> | null>;
  findOrFail(id: any): Promise<ModelInstance<T>>;
  findMany(ids: any[]): Promise<ModelInstance<T>[]>;
  first(): Promise<ModelInstance<T> | null>;
  firstOrFail(): Promise<ModelInstance<T>>;
  all(): Promise<ModelInstance<T>[]>;
  where(conditions: Partial<T> | WhereConditions): ModelQuery<T>;
  insert(records: Partial<T>[]): Promise<void>;
  update(attributes: Partial<T>, conditions?: WhereConditions): Promise<number>;
  delete(conditions?: WhereConditions): Promise<number>;
  count(conditions?: WhereConditions): Promise<number>;

  validateSchema(): boolean;
  getTableName(): string;
  getPrimaryKey(): string;
  getSchema(): ModelSchema;
  getRelations(): Record<string, RelationDefinition>;

  on(event: string, listener: (...args: any[]) => void): Model<T>;
  off(event: string, listener?: (...args: any[]) => void): Model<T>;
  emit(event: string, ...args: any[]): boolean;
}

/** Pagination result with typed data */
export interface PaginationResult<T extends Record<string, any> = Record<string, any>> {
  data: ModelInstance<T>[];
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  from: number;
  to: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Simple pagination result with typed data */
export interface SimplePaginationResult<T extends Record<string, any> = Record<string, any>> {
  data: ModelInstance<T>[];
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
  bigIncrements(name?: string): ColumnBuilder;
  string(name: string, length?: number): ColumnBuilder;
  text(name: string): ColumnBuilder;
  mediumText(name: string): ColumnBuilder;
  longText(name: string): ColumnBuilder;
  integer(name: string): ColumnBuilder;
  smallInteger(name: string): ColumnBuilder;
  tinyInteger(name: string): ColumnBuilder;
  bigInteger(name: string): ColumnBuilder;
  float(name: string, precision?: number, scale?: number): ColumnBuilder;
  double(name: string, precision?: number, scale?: number): ColumnBuilder;
  decimal(name: string, precision?: number, scale?: number): ColumnBuilder;
  boolean(name: string): ColumnBuilder;
  date(name: string): ColumnBuilder;
  datetime(name: string): ColumnBuilder;
  timestamp(name: string): ColumnBuilder;
  timestamps(useTimestamps?: boolean, defaultToNow?: boolean): void;
  softDeletes(columnName?: string): ColumnBuilder;
  json(name: string): ColumnBuilder;
  jsonb(name: string): ColumnBuilder;
  uuid(name: string): ColumnBuilder;
  binary(name: string, length?: number): ColumnBuilder;
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
  indexType?: 'btree' | 'hash' | 'gist' | 'gin' | 'spgist' | 'brin';
  storageParameters?: Record<string, any>;
  unique?: boolean;
  where?: string;
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
  | 'returning'
  | 'fullTextSearch';

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
export interface ModelMiddlewareOptions<T extends Record<string, any> = Record<string, any>> {
  model: string | Model<T>;
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

/**
 * Helper type to infer model attributes from schema definition.
 */
export type InferModelAttributes<S extends ModelSchema> = {
  [K in keyof S]: S[K]['type'] extends 'string' ? string
    : S[K]['type'] extends 'number' ? number
    : S[K]['type'] extends 'boolean' ? boolean
    : S[K]['type'] extends 'date' ? Date
    : S[K]['type'] extends 'json' | 'array' | 'object' ? any
    : S[K]['type'] extends 'uuid' ? string
    : S[K]['type'] extends 'bigint' ? bigint
    : S[K]['type'] extends 'decimal' ? number
    : unknown;
};

// ============================================================================
// Main Functions
// ============================================================================

/** Create a query configuration object */
export function createQuery(config: QueryConfig): QueryConfig;

/** Execute a query using the provided configuration */
export function executeQuery<T = any>(db: DatabaseConnection, query: QueryConfig): Promise<QueryResult<T>>;

/**
 * Create a typed model.
 *
 * @example
 * ```typescript
 * interface User {
 *   id: number;
 *   email: string;
 *   name: string;
 * }
 *
 * const User = createModel<User>({
 *   table: 'users',
 *   schema: {
 *     id: { type: 'number', primaryKey: true },
 *     email: { type: 'string', unique: true },
 *     name: { type: 'string' }
 *   }
 * });
 *
 * // Type-safe: user is ModelInstance<User>
 * const user = await User.create({ email: 'test@example.com', name: 'Test' });
 * console.log(user.email); // Type-safe access
 * ```
 */
export function createModel<T extends Record<string, any> = Record<string, any>>(
  config: ModelConfig<T>
): Model<T>;

/** Create a migration */
export function createMigration(config: MigrationConfig): Migration;

/** Create a database manager */
export function createDatabaseManager(config: DatabaseConfig): DatabaseManager;

/** Create a connection */
export function createConnection(config: DatabaseConfig): Promise<DatabaseConnection>;

/**
 * Create a connection from database-specific configuration.
 * Provides better type inference for database-specific options.
 */
export function createTypedConnection<T extends DatabaseSpecificConfig>(
  config: T
): Promise<DatabaseConnection>;

/** Run migrations */
export function runMigrations(
  connection: DatabaseConnection,
  migrations: Migration[],
  options?: { target?: string }
): Promise<MigrationStatus[]>;

/** Database adapter creators */
export function createPostgreSQLAdapter(config: PostgreSQLConfig | DatabaseConfig): DatabaseAdapter;
export function createMySQLAdapter(config: MySQLConfig | DatabaseConfig): DatabaseAdapter;
export function createSQLiteAdapter(config: SQLiteConfig | DatabaseConfig): DatabaseAdapter;
export function createMongoDBAdapter(config: MongoDBConfig | DatabaseConfig): DatabaseAdapter;

/** Middleware functions */
export function withDatabase(options?: DatabaseMiddlewareOptions): any;
export function withTransaction(options?: TransactionMiddlewareOptions): any;
export function withModel<T extends Record<string, any>>(options: ModelMiddlewareOptions<T>): any;
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
  createTypedConnection: typeof createTypedConnection;
  runMigrations: typeof runMigrations;
  setupDatabase: typeof setupDatabase;
  DEFAULT_DB_CONFIG: typeof DEFAULT_DB_CONFIG;
};

export default coherentDatabase;
