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

/** A custom adapter object passed as `config.adapter` instead of a `type`. */
export interface CustomAdapter {
  createPool(config: DatabaseConfig): Promise<unknown>;
  testConnection?(pool: unknown): Promise<unknown>;
  ping?(): Promise<unknown>;
  query?(pool: unknown, sql: string, params?: any[], options?: Record<string, unknown>): Promise<any>;
  transaction?(pool: unknown, options?: TransactionOptions): Promise<Transaction>;
  getPoolStats?(pool: unknown): PoolStats;
  closePool?(pool: unknown): Promise<void>;
  disconnect?(): Promise<void>;
  [key: string]: any;
}

/** Database configuration options */
export interface DatabaseConfig {
  /** Built-in adapter to use; required unless `adapter` is given. */
  type?: DatabaseType;
  /** Custom adapter used instead of `type`. */
  adapter?: CustomAdapter;
  /** Store options for a custom adapter (a string is the store name). */
  store?: string | { name?: string; [key: string]: unknown };
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  /** Database name (file path for SQLite); required for every type but `memory`. */
  database?: string;
  synchronize?: boolean;
  logging?: boolean | ((sql: string, parameters?: any[]) => void);
  entities?: any[];
  migrations?: any[];
  subscribers?: any[];
  ssl?: boolean | object;
  extra?: object;
  autoConnect?: boolean;
  /** Log every query. */
  debug?: boolean;
  /** Open SQLite read-only. */
  readonly?: boolean;
  /** Connection URL (MongoDB) */
  url?: string;
  /** Driver client options (MongoDB) */
  options?: Record<string, unknown>;
  connectionTimeout?: number;
  acquireTimeout?: number;
  timeout?: number;
  timezone?: string;
  charset?: string;
  pool?: PoolConfig;
  /** Run a periodic connection test after connect() (default true); emits `healthCheck` events. */
  healthCheck?: boolean;
  /** Milliseconds between health checks (default 30000). */
  healthCheckInterval?: number;
}

/** Database connection pool configuration */
export interface PoolConfig {
  min?: number;
  max?: number;
  acquireTimeoutMillis?: number;
  createTimeoutMillis?: number;
  destroyTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  reapIntervalMillis?: number;
  createRetryIntervalMillis?: number;
}

/** Pool statistics reported by an adapter. */
export interface PoolStats {
  total: number;
  available: number;
  acquired: number;
  waiting: number;
}

/**
 * @deprecated Describes an API that does not exist at runtime. `createConnection()`
 * resolves to a connected {@link DatabaseManager}.
 */
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

/** Transaction isolation levels */
export type TransactionIsolation =
  | 'READ UNCOMMITTED'
  | 'READ COMMITTED'
  | 'REPEATABLE READ'
  | 'SERIALIZABLE';

/** Options for `db.transaction()` and `withTransaction()`. */
export interface TransactionOptions {
  /** One of the four standard levels (any case); anything else throws. */
  isolationLevel?: TransactionIsolation | Lowercase<TransactionIsolation> | null;
  readOnly?: boolean;
}

/** A database transaction, as returned by `db.transaction()`. */
export interface Transaction {
  query<T = any>(sql: string, parameters?: any[]): Promise<QueryResult<T>>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  readonly isCommitted: boolean;
  readonly isRolledBack: boolean;
}

/** Minimal surface of a document-store collection (the MongoDB driver Collection). */
export interface DocumentCollection {
  insertOne(doc: Record<string, unknown>): Promise<{ insertedId: unknown }>;
  findOne(filter: Record<string, unknown>, options?: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<{ modifiedCount: number }>;
  deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount: number }>;
  createIndex(spec: Record<string, unknown>, options?: Record<string, unknown>): Promise<string>;
}

/** Statistics from `db.getStats()`. */
export interface DatabaseStats {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  queriesExecuted: number;
  averageQueryTime: number;
  lastHealthCheck: Date | null;
  isConnected: boolean;
  poolStats: PoolStats | null;
}

/**
 * Database manager (an EventEmitter): emits `query`, `queryError`, `connect:test`,
 * `healthCheck`, `disconnected`, and `error` when a listener is attached.
 */
export interface DatabaseManager {
  readonly config: DatabaseConfig;
  readonly isConnected: boolean;
  /** Delay between connection attempts, in milliseconds (default 2000). */
  retryDelay: number;
  maxRetries: number;

  /** Connect, retrying up to `maxRetries` times. */
  connect(): Promise<DatabaseManager | void>;
  /** Run a query: SQL with `?` placeholders (or an operation name for the memory adapter). */
  query<T = any>(sql: string, params?: any[] | Record<string, unknown>): Promise<QueryResult<T>>;
  /** Start a transaction. */
  transaction(options?: TransactionOptions): Promise<Transaction>;
  /** Run a callback in a transaction: committed when it resolves, rolled back when it throws. */
  transaction<R>(callback: (trx: Transaction) => Promise<R>, options?: TransactionOptions): Promise<R>;
  /** Document-store collection access (MongoDB adapter only; throws otherwise). */
  collection(name: string): DocumentCollection;
  testConnection(): Promise<void>;
  getStats(): DatabaseStats;
  close(): Promise<void>;

  on(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  off(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
}

// ============================================================================
// Query Builder Types
// ============================================================================

/** Operators accepted in WHERE operator objects (matched case-insensitively). */
type BaseSqlOperator =
  | '=' | '!=' | '<>' | '>' | '>=' | '<' | '<='
  | 'LIKE' | 'NOT LIKE' | 'ILIKE' | 'NOT ILIKE'
  | 'IN' | 'NOT IN' | 'BETWEEN' | 'NOT BETWEEN';

/** SQL operators for where conditions */
export type SqlOperator = BaseSqlOperator | Lowercase<BaseSqlOperator>;

/** A single value compared with `=` (or `IS NULL` for null). */
export type WhereScalar = string | number | bigint | boolean | Date | Uint8Array | null;

/**
 * Operator object: `{ '>': 18 }`, `{ in: [1, 2] }`, `{ between: [1, 10] }`.
 * Unknown operators and undefined operands throw.
 */
export type WhereOperators = { [K in SqlOperator]?: WhereScalar | WhereScalar[] };

/** Where condition value. `undefined` throws; arrays must go through `{ in: [...] }`. */
export type WhereValue = WhereScalar | WhereOperators;

/** Where conditions object: columns are ANDed together. */
export type WhereConditions = {
  [column: string]: WhereValue | WhereConditions | WhereConditions[];
} & {
  $or?: WhereConditions[];
  $and?: WhereConditions[];
  $not?: WhereConditions;
};

/** Order by direction */
export type OrderDirection = 'ASC' | 'DESC' | 'asc' | 'desc';

/** Order by configuration */
export interface OrderByConfig {
  [column: string]: OrderDirection;
}

type BaseJoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS' | 'LEFT OUTER' | 'RIGHT OUTER' | 'FULL OUTER';

/** Join types */
export type JoinType = BaseJoinType | Lowercase<BaseJoinType>;

/** Join configuration */
export interface JoinConfig {
  type?: JoinType;
  table: string;
  alias?: string;
  /** Column comparisons joined with AND, e.g. `'users.id = posts.user_id'`. Not used for CROSS joins. */
  condition?: string;
  /** Alias of `condition`. */
  on?: string;
}

/** @deprecated Not supported by the query builder; `groupBy` throws. */
export type GroupByConfig = string | string[];

/** @deprecated Not supported by the query builder; `having` throws. */
export type HavingConditions = WhereConditions;

/** A table with an optional alias (aliases are only allowed in SELECT queries). */
export interface TableReference {
  table: string;
  alias?: string;
}

/**
 * Query configuration object.
 *
 * Identifiers must be `name` or `table.name`; unknown options throw.
 * UPDATE and DELETE require a non-empty `where` unless `allowFullTable` is true.
 */
export interface QueryConfig {
  table?: string | TableReference;
  /** Alias of `table`. */
  from?: string | TableReference;
  /** Alias for `table` in SELECT queries. */
  alias?: string;
  /** Columns, `*`, `table.*`, or `COUNT|SUM|AVG|MIN|MAX(column)`, each optionally `AS alias`. */
  select?: string | string[] | SelectConfig;
  joins?: JoinConfig[];
  where?: WhereConditions;
  orderBy?: string | Array<string | OrderByConfig> | OrderByConfig;
  /** Non-negative integer; 0 means no limit. */
  limit?: number;
  /** Non-negative integer. */
  offset?: number;
  insert?: Record<string, any> | Record<string, any>[];
  update?: Record<string, any>;
  delete?: boolean;
  /** Columns for a RETURNING clause on insert, update or delete. */
  returning?: string | string[];
  /** Allow an UPDATE or DELETE without a WHERE clause (affects every row). */
  allowFullTable?: boolean;
}

/** Select configuration with column aliasing: `{ alias: 'column' }` → `column AS alias`. */
export interface SelectConfig {
  [alias: string]: string;
}

/** @deprecated Not supported by the query builder. */
export interface WithConfig {
  name: string;
  query: QueryConfig;
  recursive?: boolean;
}

/** Anything with a `query(sql, params)` method, such as a DatabaseManager or a transaction. */
export interface QueryExecutor {
  query(sql: string, params?: any[]): Promise<any>;
}

/** SQL query result, as returned by the SQL adapters. */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number;
  /** Rows changed by an INSERT, UPDATE or DELETE. */
  affectedRows?: number;
  /** Generated key of an INSERT, when the driver reports one. */
  insertId?: number | string | null;
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

/** Attribute options of a `createModel` definition. */
export interface ModelAttributeDefinition {
  type?: string;
  required?: boolean;
  default?: unknown;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  [option: string]: unknown;
}

/** Model definition passed to `registerModel()`. */
export interface ModelDefinition<T extends Record<string, any> = Record<string, any>> {
  tableName: string;
  primaryKey?: string;
  attributes: Record<string, ModelAttributeDefinition>;
  /** Instance methods, bound to each record. */
  methods?: Record<string, (this: ModelRecord<T>, ...args: any[]) => any>;
  /** Static methods, bound to the registered model. */
  statics?: Record<string, (this: RegisteredModel<T>, ...args: any[]) => any>;
  [option: string]: unknown;
}

/** A record returned by a registered model: its columns plus save(), delete() and the definition's methods. */
export type ModelRecord<T extends Record<string, any> = Record<string, any>> = T & {
  /** Insert the record, or update it when it has a primary key. */
  save(): Promise<ModelRecord<T>>;
  /** Delete the record; resolves to the number of rows deleted. */
  delete(): Promise<number>;
  [member: string]: any;
};

/** A model registered with `createModel(db).registerModel()`. */
export interface RegisteredModel<T extends Record<string, any> = Record<string, any>> {
  readonly name: string;
  readonly tableName: string;
  readonly primaryKey?: string;
  readonly db: QueryExecutor;

  /** Run a query on the model's table; queries with `select` resolve to records, others to the driver result. */
  query(config: QueryConfig): Promise<any>;
  find(id: unknown): Promise<ModelRecord<T> | null>;
  all(): Promise<ModelRecord<T>[]>;
  where(config: QueryConfig): Promise<any>;
  create(attributes: Partial<T>): Promise<ModelRecord<T>>;
  /** Resolves to the number of rows the driver reports as changed. */
  updateWhere(conditions: WhereConditions, updates: Partial<T>): Promise<number>;
  /** Resolves to the number of rows the driver reports as deleted. */
  deleteWhere(conditions: WhereConditions): Promise<number>;

  /** Static methods from the definition. */
  [staticMethod: string]: any;
}

/** Model registry returned by `createModel(db)`. */
export interface ModelRegistry {
  registerModel<T extends Record<string, any> = Record<string, any>>(
    name: string,
    definition: ModelDefinition<T>
  ): RegisteredModel<T>;
  /** Run one query per registered model: `{ User: { select: '*' }, Post: { ... } }`. */
  execute(queries: Record<string, QueryConfig>): Promise<Record<string, any>>;
  getModel<T extends Record<string, any> = Record<string, any>>(name: string): RegisteredModel<T> | undefined;
}

/**
 * Field type definitions for model schema.
 * @deprecated Part of the declared-but-unimplemented `Model` API.
 */
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array' | 'object' | 'uuid' | 'bigint' | 'decimal';

/**
 * Model field definition
 * @deprecated Part of the declared-but-unimplemented `Model` API; see {@link ModelDefinition}.
 */
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

/**
 * Model schema definition
 * @deprecated Part of the declared-but-unimplemented `Model` API.
 */
export interface ModelSchema {
  [field: string]: FieldDefinition;
}

/**
 * Relation types
 * @deprecated Part of the declared-but-unimplemented `Model` API.
 */
export type RelationType = 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';

/**
 * Relation definition
 * @deprecated Part of the declared-but-unimplemented `Model` API.
 */
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

/**
 * Model configuration
 * @deprecated Describes an API that does not exist at runtime; see {@link ModelDefinition}.
 */
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

/**
 * Model lifecycle hooks
 * @deprecated Part of the declared-but-unimplemented `Model` API.
 */
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
 * @deprecated Describes an API that does not exist at runtime; see {@link ModelRecord}.
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
 * @deprecated Describes an API that does not exist at runtime; use {@link executeQuery}.
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
 * @deprecated Describes an API that does not exist at runtime; see {@link RegisteredModel}.
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

/**
 * Pagination result with typed data
 * @deprecated Part of the declared-but-unimplemented `Model` API.
 */
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

/**
 * Simple pagination result with typed data
 * @deprecated Part of the declared-but-unimplemented `Model` API.
 */
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

/** DDL dialect used by migrations. */
export type MigrationDialect = 'postgresql' | 'mysql' | 'sqlite';

/** A migration: the `up` / `down` exports of a migration file, or an entry of `migrations`. */
export interface MigrationDefinition {
  name: string;
  up?: (schema: SchemaBuilder) => Promise<unknown> | unknown;
  down?: (schema: SchemaBuilder) => Promise<unknown> | unknown;
}

/** Options for `createMigration()` and `runMigrations()`. */
export interface MigrationOptions {
  /** Directory of migration files, relative to the working directory (default './migrations'). */
  directory?: string;
  /** Tracking table (default 'coherent_migrations'). */
  tableName?: string;
  /** DDL dialect; defaults to the manager's `config.type`, else SQLite. */
  dialect?: MigrationDialect;
  /** Run each migration in a transaction (default true). */
  transactional?: boolean;
}

/** Entry of `createMigration(db).status()`. */
export interface MigrationFileStatus {
  name: string;
  applied: boolean;
  file: string;
}

/** Migration runner returned by `createMigration()`. */
export interface MigrationRunner {
  /** Create the tracking table and load applied and available migrations. */
  initialize(): Promise<void>;
  /** Apply pending migrations in one batch; resolves to their names. */
  run(options?: { continueOnError?: boolean }): Promise<string[]>;
  /** Roll back the last `steps` batches (default 1); resolves to the names rolled back. */
  rollback(steps?: number): Promise<string[]>;
  status(): Promise<MigrationFileStatus[]>;
  /** Write a new migration file; resolves to its path. */
  create(name: string, options?: { table?: string }): Promise<string>;
}

/** Schema builder passed to a migration's `up` / `down`. */
export interface SchemaBuilder {
  createTable(name: string, callback: (table: TableBuilder) => void): Promise<unknown>;
  alterTable(name: string, callback: (table: TableBuilder) => void): Promise<unknown>;
  dropTable(name: string): Promise<unknown>;
  raw(sql: string, params?: any[]): Promise<any>;
}

/** Table builder used in `createTable` / `alterTable` callbacks. */
export interface TableBuilder {
  /** Auto-incrementing integer primary key (default name 'id'). */
  id(name?: string): TableBuilder;
  string(name: string, length?: number): ColumnBuilder;
  text(name: string): ColumnBuilder;
  integer(name: string): ColumnBuilder;
  boolean(name: string): ColumnBuilder;
  datetime(name: string): ColumnBuilder;
  /** created_at and updated_at datetime columns. */
  timestamps(): TableBuilder;
  addColumn(name: string, type: string): TableBuilder;
  dropColumn(name: string): TableBuilder;
  toCreateSQL(): string;
  toAlterSQL(): string[];
}

/** Column modifiers. */
export interface ColumnBuilder {
  notNull(): ColumnBuilder;
  unique(): ColumnBuilder;
  /** Literal default; strings are quoted and escaped. */
  default(value: string | number | bigint | boolean | Date | null): ColumnBuilder;
  /** SQL expression default, e.g. `defaultRaw('CURRENT_TIMESTAMP')`; not escaped. */
  defaultRaw(expression: string): ColumnBuilder;
  /** Foreign key to `'table.column'`. */
  references(foreignKey: string): ColumnBuilder;
}

/**
 * Migration configuration
 * @deprecated Describes an API that does not exist at runtime; see {@link MigrationDefinition}
 * and {@link MigrationOptions}.
 */
export interface MigrationConfig {
  name: string;
  version: string;
  description?: string;
  up: (schema: SchemaBuilder) => Promise<void> | void;
  down: (schema: SchemaBuilder) => Promise<void> | void;
  dependencies?: string[];
}

/** @deprecated Not supported by the table builder. */
export interface ForeignKeyBuilder {
  references(column: string): ForeignKeyBuilder;
  inTable(table: string): ForeignKeyBuilder;
  onDelete(action: ForeignKeyAction): ForeignKeyBuilder;
  onUpdate(action: ForeignKeyAction): ForeignKeyBuilder;
  deferrable(type?: 'not deferrable' | 'immediate' | 'deferred'): ForeignKeyBuilder;
}

/** @deprecated Not supported by the table builder. */
export type ForeignKeyAction = 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';

/** @deprecated Not supported by the table builder. */
export interface IndexOptions {
  indexName?: string;
  indexType?: 'btree' | 'hash' | 'gist' | 'gin' | 'spgist' | 'brin';
  storageParameters?: Record<string, any>;
  unique?: boolean;
  where?: string;
}

/**
 * Migration interface
 * @deprecated Describes an API that does not exist at runtime; see {@link MigrationRunner}.
 */
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

/** Adapter created by `PostgreSQLAdapter()` / `MySQLAdapter()`. */
export interface PooledSQLAdapter {
  createPool(config: DatabaseConfig): Promise<unknown>;
  testConnection(pool: unknown): Promise<void>;
  query<T = any>(pool: unknown, sql: string, params?: any[], options?: { single?: boolean }): Promise<QueryResult<T>>;
  transaction(pool: unknown, options?: TransactionOptions): Promise<Transaction>;
  getPoolStats(pool: unknown): PoolStats;
  closePool(pool: unknown): Promise<void>;
}

/** Adapter created by `SQLiteAdapter()`. */
export interface SQLiteAdapterInstance {
  connect(config: DatabaseConfig): Promise<SQLiteAdapterInstance>;
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  execute(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId: number }>;
  transaction(pool?: unknown, options?: { mode?: 'DEFERRED' | 'IMMEDIATE' | 'EXCLUSIVE' }): Promise<Transaction>;
  getPoolStats(): PoolStats;
  disconnect(): Promise<void>;
  ping(): Promise<boolean>;
  escape(value: unknown): string;
  [method: string]: any;
}

/** Transaction returned by the MongoDB adapter. */
export interface MongoDBTransaction {
  readonly session: unknown;
  readonly isCommitted: boolean;
  readonly isRolledBack: boolean;
  /** Runs `find` inside the transaction. */
  query<T = any>(collection: string, filter?: Record<string, unknown>, options?: Record<string, unknown>): Promise<T[]>;
  /** Raw collection: pass `{ session: tx.session }` to its operations. */
  collection(name: string): DocumentCollection;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/** Adapter created by `MongoDBAdapter()`. */
export interface MongoDBAdapterInstance {
  connect(config: DatabaseConfig): Promise<MongoDBAdapterInstance>;
  query<T = any>(collection: string, filter?: Record<string, unknown>, options?: Record<string, unknown>): Promise<T[]>;
  collection(name: string): DocumentCollection;
  transaction(pool?: unknown, options?: Record<string, unknown>): Promise<MongoDBTransaction>;
  disconnect(): Promise<void>;
  closePool(): Promise<void>;
  ping(): Promise<boolean>;
  [method: string]: any;
}

/**
 * Database adapter interface
 * @deprecated Describes an API that does not exist at runtime; see {@link PooledSQLAdapter},
 * {@link SQLiteAdapterInstance} and {@link MongoDBAdapterInstance}.
 */
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

/** @deprecated Part of the deprecated {@link DatabaseAdapter} interface. */
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

/**
 * Middleware returned by the `with*` helpers. `next` is optional: routers that run
 * middleware without it (such as the Coherent.js API router) continue on their own.
 */
export type DatabaseMiddleware = (req: any, res: any, next?: (error?: unknown) => unknown) => Promise<unknown>;

/** Options for `withDatabase()`. */
export interface DatabaseMiddlewareOptions {
  /** Connect on the first request if needed (default true). */
  autoConnect?: boolean;
  /** Attach `db.models` as `req.models` when present (default true). */
  attachModels?: boolean;
}

/** Options for `withTransaction()`. */
export type TransactionMiddlewareOptions = TransactionOptions;

/**
 * @deprecated `withModel(ModelClass, paramName?, requestKey?)` takes positional arguments.
 */
export interface ModelMiddlewareOptions<T extends Record<string, any> = Record<string, any>> {
  model: string | Model<T>;
  connection?: string;
  as?: string;
}

/** Options for `withPagination()`. */
export interface PaginationMiddlewareOptions {
  /** Default page size (default 20). */
  defaultLimit?: number;
  /** Largest page size accepted (default 100). */
  maxLimit?: number;
  /** Query parameter holding the page number (default 'page'). */
  pageParam?: string;
  /** Query parameter holding the page size (default 'limit'). */
  limitParam?: string;
}

/** `req.pagination` set by `withPagination()`. */
export interface PaginationInfo {
  page: number;
  limit: number;
  offset: number;
  hasNext: boolean | null;
  hasPrev: boolean;
  totalPages: number | null;
  totalCount: number | null;
}

/** A model that `withModel()` can load: anything with a static `find(id)`. */
export interface FindableModel {
  readonly name?: string;
  readonly tableName?: string;
  find(id: string): Promise<unknown>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Connection string parser result
 * @deprecated Not used by any runtime API.
 */
export interface ConnectionInfo {
  type: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  options?: Record<string, any>;
}

/**
 * Migration status
 * @deprecated See {@link MigrationFileStatus}.
 */
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
 * @deprecated Part of the declared-but-unimplemented `Model` API.
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

/**
 * Build and execute a query configuration.
 * Throws before querying on unsafe identifiers, unknown operators or options, undefined
 * WHERE values, invalid LIMIT/OFFSET, or UPDATE/DELETE without WHERE (see `allowFullTable`).
 */
export function executeQuery<T = any>(db: QueryExecutor, query: QueryConfig): Promise<QueryResult<T>>;

/**
 * Create a model registry bound to a database.
 *
 * @example
 * ```typescript
 * interface User {
 *   id: number;
 *   email: string;
 *   name: string;
 * }
 *
 * const models = createModel(db);
 * const User = models.registerModel<User>('User', {
 *   tableName: 'users',
 *   attributes: {
 *     id: { type: 'number', primaryKey: true },
 *     email: { type: 'string', required: true },
 *     name: { type: 'string' }
 *   }
 * });
 *
 * const user = await User.create({ email: 'test@example.com', name: 'Test' });
 * console.log(user.email);
 * ```
 */
export function createModel(db: QueryExecutor): ModelRegistry;

/** Create a migration runner. */
export function createMigration(db: QueryExecutor | null, config?: MigrationOptions): MigrationRunner;

/** Create a database manager */
export function createDatabaseManager(config: DatabaseConfig): DatabaseManager;

/** Create a database manager and connect it. */
export function createConnection(config: DatabaseConfig): Promise<DatabaseManager>;

/** Run pending migrations; resolves to the names applied. */
export function runMigrations(db: QueryExecutor, config?: MigrationOptions): Promise<string[]>;

/** Attach `req.db`, `req.dbQuery()` and `req.transaction(callback)`, connecting first if needed. */
export function withDatabase(db: DatabaseManager, options?: DatabaseMiddlewareOptions): DatabaseMiddleware;

/**
 * Run the request in a transaction exposed as `req.tx`. Committed after an async `next()`
 * resolves or, with Express-style / next-less routers, when the response finishes with a
 * status below 400; rolled back otherwise.
 */
export function withTransaction(
  db: Pick<DatabaseManager, 'transaction'>,
  options?: TransactionMiddlewareOptions
): DatabaseMiddleware;

/**
 * Load `ModelClass.find(req.params[paramName])` into `req[requestKey]` (default: the lower-cased
 * model name). When it resolves to null (or the parameter is missing) it passes an error
 * whose `status` and `statusCode` are 404 (400) to `next` — or throws it when called
 * without `next` — so Express and the `@coherent.js/api` router both answer 404 (400).
 */
export function withModel(model: FindableModel, paramName?: string, requestKey?: string | null): DatabaseMiddleware;

/** Parse `page` / `limit` query parameters into `req.pagination`. */
export function withPagination(options?: PaginationMiddlewareOptions): DatabaseMiddleware;

/** Setup database with default configuration */
export function setupDatabase(config?: Partial<DatabaseConfig>): DatabaseManager;

/** Default database configuration */
export const DEFAULT_DB_CONFIG: DatabaseConfig;

// ============================================================================
// Adapter Exports
// ============================================================================

export const PostgreSQLAdapter: () => PooledSQLAdapter;
export const MySQLAdapter: () => PooledSQLAdapter;
export const SQLiteAdapter: () => SQLiteAdapterInstance;
export const MongoDBAdapter: () => MongoDBAdapterInstance;
