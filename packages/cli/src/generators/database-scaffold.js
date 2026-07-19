/**
 * Database Scaffolding Generator
 * Generates database configuration and setup files
 */

import { getCLIVersion } from '../utils/version.js';

// Get current CLI version automatically
const cliVersion = getCLIVersion();

/**
 * Generate database configuration file
 */
export function generateDatabaseConfig(dbType) {
  const configs = {
    postgres: `
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'coherent_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // Connection pool settings
  pool: {
    min: 2,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
};
`,
    mysql: `
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'coherent_db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  // Connection pool settings
  pool: {
    max: 10,
    min: 0,
    waitForConnections: true,
    queueLimit: 0
  }
};
`,
    sqlite: `
export const dbConfig = {
  filename: process.env.DB_PATH || './data/database.sqlite',
  // SQLite options
  verbose: process.env.NODE_ENV === 'development'
};
`,
    mongodb: `
export const dbConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/coherent_db',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }
};
`
  };

  return configs[dbType] || '';
}

/**
 * Generate database initialization file
 */
export function generateDatabaseInit(dbType, language = 'javascript') {
  const isTypeScript = language === 'typescript';
  const typeAnnotation = isTypeScript ? ': any' : '';
  const returnType = isTypeScript ? ': Promise<any>' : '';

  const inits = {
    postgres: `
import { setupDatabase } from '@coherent.js/database';
import { dbConfig } from './config.js';

let db${typeAnnotation};

export async function initDatabase()${returnType} {
  try {
    // Setup database with Coherent.js
    db = setupDatabase({
      type: 'postgresql',
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      username: dbConfig.user,
      password: dbConfig.password,
      pool: dbConfig.pool,
      autoConnect: false
    });

    await db.connect();

    console.log('✓ Connected to PostgreSQL database');

    return db;
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

export function getDatabase()${typeAnnotation} {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (db) {
    await db.disconnect();
    console.log('Database connection closed');
  }
  process.exit(0);
});
`,
    mysql: `
import { setupDatabase } from '@coherent.js/database';
import { dbConfig } from './config.js';

let db${typeAnnotation};

export async function initDatabase()${returnType} {
  try {
    // Setup database with Coherent.js
    db = setupDatabase({
      type: 'mysql',
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      username: dbConfig.user,
      password: dbConfig.password,
      pool: dbConfig.pool,
      autoConnect: false
    });

    await db.connect();

    console.log('✓ Connected to MySQL database');

    return db;
  } catch (error) {
    console.error('Failed to connect to MySQL:', error);
    throw error;
  }
}

export function getDatabase()${typeAnnotation} {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (db) {
    await db.disconnect();
    console.log('Database connection closed');
  }
  process.exit(0);
});
`,
    sqlite: `
import { setupDatabase } from '@coherent.js/database';
import { dbConfig } from './config.js';
import { UserModel } from './models/User.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

let db${typeAnnotation};

export async function initDatabase()${returnType} {
  try {
    // Ensure directory exists for SQLite file
    if (dbConfig.filename && dbConfig.filename !== ':memory:') {
      mkdirSync(dirname(dbConfig.filename), { recursive: true });
    }

    // Setup database with Coherent.js.
    // autoConnect: false — otherwise setupDatabase fires a non-awaited
    // connect() that races our explicit await db.connect() below and
    // can cause SQLITE_BUSY (WAL mode allows only one writer at a time).
    db = setupDatabase({
      type: 'sqlite',
      database: dbConfig.filename || ':memory:',
      autoConnect: false
    });

    await db.connect();

    // Bootstrap schema (idempotent — uses CREATE TABLE IF NOT EXISTS).
    // Add additional model.createTable() calls here as you add models.
    await UserModel.createTable();

    console.log('✓ Connected to SQLite database');

    return db;
  } catch (error) {
    console.error('Failed to initialize SQLite:', error);
    throw error;
  }
}

export function getDatabase()${typeAnnotation} {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (db) {
    await db.disconnect();
    console.log('Database closed');
  }
  process.exit(0);
});
`,
    mongodb: `
import { setupDatabase } from '@coherent.js/database';
import { dbConfig } from './config.js';

let db${typeAnnotation};

export async function initDatabase()${returnType} {
  try {
    // Setup database with Coherent.js
    db = setupDatabase({
      type: 'mongodb',
      database: dbConfig.uri,
      ...dbConfig.options,
      autoConnect: false
    });

    await db.connect();

    console.log('✓ Connected to MongoDB database');

    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export function getDatabase()${typeAnnotation} {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (db) {
    await db.disconnect();
    console.log('Database connection closed');
  }
  process.exit(0);
});
`
  };

  return inits[dbType] || '';
}

/**
 * Generate example model file
 */
export function generateExampleModel(dbType, language = 'javascript') {
  const isTypeScript = language === 'typescript';
  const typeAnnotation = isTypeScript ? ': Promise<any>' : '';
  const pUser = isTypeScript ? ': UserData' : '';
  const pId = isTypeScript ? ': number' : '';
  const pEmail = isTypeScript ? ': string' : '';
  const pPartial = isTypeScript ? ': Partial<UserData>' : '';
  const pUpdate = isTypeScript ? ": Pick<UserData, 'email' | 'name'>" : '';
  const pIdMongo = isTypeScript ? ': string' : '';
  const interfaceDef = isTypeScript ? `
interface UserData {
  email: string;
  name: string;
  /** "scrypt:<salt>:<hash>" produced by the auth scaffold's hashPassword() */
  passwordHash?: string;
}` : '';

  const models = {
    postgres: `
import { getDatabase } from '../index.js';

${interfaceDef}

export class UserModel {
  static async createTable()${typeAnnotation} {
    const db = getDatabase();
    await db.query(\`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    \`);
  }

  static async create(userData${pUser})${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [userData.email, userData.name, userData.passwordHash ?? null]
    );
    return result.rows[0];
  }

  static async findById(id${pId})${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByEmail(email${pEmail})${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async update(id${pId}, data${pUpdate})${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query(
      'UPDATE users SET email = $1, name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [data.email, data.name, id]
    );
    return result.rows[0];
  }

  static async delete(id${pId})${typeAnnotation} {
    const db = getDatabase();
    await db.query('DELETE FROM users WHERE id = $1', [id]);
  }
}
`,
    mysql: `
import { getDatabase } from '../index.js';

${interfaceDef}

export class UserModel {
  static async createTable()${typeAnnotation} {
    const db = getDatabase();
    await db.query(\`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    \`);
  }

  static async create(userData${pUser})${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)',
      [userData.email, userData.name, userData.passwordHash ?? null]
    );
    return this.findById(result.insertId);
  }

  static async findById(id${pId})${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return result.rows[0];
  }

  static async findByEmail(email${pEmail})${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return result.rows[0];
  }

  static async update(id${pId}, data${pUpdate})${typeAnnotation} {
    const db = getDatabase();
    await db.query(
      'UPDATE users SET email = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [data.email, data.name, id]
    );
    return this.findById(id);
  }

  static async delete(id${pId})${typeAnnotation} {
    const db = getDatabase();
    await db.query('DELETE FROM users WHERE id = ?', [id]);
  }
}
`,
    sqlite: `
import { getDatabase } from '../index.js';

${interfaceDef}

// Uses the @coherent.js/database manager API (db.query → { rows: [...] }).
// Avoids RETURNING * for portability: it requires SQLite 3.35+, and the
// adapter's pinned sqlite3 may bundle an older libsqlite. Instead we
// follow INSERT/UPDATE with a SELECT on the known unique key.
export class UserModel {
  static async createTable()${typeAnnotation} {
    const db = getDatabase();
    await db.query(\`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    \`);
  }

  static async create(data${pUser})${typeAnnotation} {
    const db = getDatabase();
    await db.query(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)',
      [data.email, data.name, data.passwordHash ?? null]
    );
    return this.findByEmail(data.email);
  }

  static async findById(id${pId})${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return result.rows[0];
  }

  static async findByEmail(email${pEmail})${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return result.rows[0];
  }

  static async update(id${pId}, data${pUpdate})${typeAnnotation} {
    const db = getDatabase();
    await db.query(
      'UPDATE users SET email = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [data.email, data.name, id]
    );
    return this.findById(id);
  }

  static async delete(id${pId})${typeAnnotation} {
    const db = getDatabase();
    await db.query('DELETE FROM users WHERE id = ?', [id]);
  }
}
`,
    mongodb: `
import { getDatabase } from '../index.js';

${interfaceDef}

export class UserModel {
  static async createCollection()${typeAnnotation} {
    const db = getDatabase();
    await db.createCollection('users');

    // Create index for email uniqueness
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
  }

  static async create(userData${pUser})${typeAnnotation} {
    const db = getDatabase();
    const result = await db.collection('users').insertOne(userData);
    return { _id: result.insertedId, ...userData };
  }

  static async findById(id${pIdMongo})${typeAnnotation} {
    const db = getDatabase();
    return await db.collection('users').findOne({ _id: id });
  }

  static async findByEmail(email${pEmail})${typeAnnotation} {
    const db = getDatabase();
    return await db.collection('users').findOne({ email });
  }

  static async update(id${pIdMongo}, data${pPartial})${typeAnnotation} {
    const db = getDatabase();
    const result = await db.collection('users').updateOne(
      { _id: id },
      { $set: { ...data, updatedAt: new Date() } }
    );
    return result.modifiedCount > 0 ? this.findById(id) : null;
  }

  static async delete(id${pIdMongo})${typeAnnotation} {
    const db = getDatabase();
    const result = await db.collection('users').deleteOne({ _id: id });
    return result.deletedCount > 0;
  }
}
`
  };

  return models[dbType] || '';
}

/**
 * Generate .env.example file for database
 */
export function generateEnvExample(dbType) {
  const envs = {
    postgres: `# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coherent_db
DB_USER=postgres
DB_PASSWORD=postgres
`,
    mysql: `# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=coherent_db
DB_USER=root
DB_PASSWORD=password
`,
    sqlite: `# SQLite Database Configuration
DB_PATH=./data/database.sqlite
`,
    mongodb: `# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/coherent_db
`
  };

  return envs[dbType] || '';
}

/**
 * Get database-specific dependencies
 */
export function getDatabaseDependencies(dbType) {
  const deps = {
    postgres: {
      pg: '^8.12.0',
      '@coherent.js/database': `^${cliVersion}`
    },
    mysql: {
      'mysql2': '^3.11.0',
      '@coherent.js/database': `^${cliVersion}`
    },
    sqlite: {
      // @coherent.js/database's SQLite adapter uses node-sqlite3 (peer dep),
      // not better-sqlite3. Keep these in sync if the adapter changes.
      sqlite3: '^5.1.7',
      '@coherent.js/database': `^${cliVersion}`
    },
    mongodb: {
      mongodb: '^6.9.0',
      '@coherent.js/database': `^${cliVersion}`
    }
  };

  return deps[dbType] || {};
}

/**
 * Generate complete database scaffolding
 */
export function generateDatabaseScaffolding(dbType, language = 'javascript') {
  return {
    config: generateDatabaseConfig(dbType),
    init: generateDatabaseInit(dbType, language),
    model: generateExampleModel(dbType, language),
    env: generateEnvExample(dbType),
    dependencies: getDatabaseDependencies(dbType)
  };
}
