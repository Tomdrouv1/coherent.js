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
import { setupDatabase, PostgreSQLAdapter } from '@coherent.js/database';
import { dbConfig } from './config.js';

let db${typeAnnotation};

export async function initDatabase()${returnType} {
  try {
    // Setup database with Coherent.js
    db = setupDatabase({
      adapter: PostgreSQLAdapter(),
      ...dbConfig
    });

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
import { setupDatabase, MySQLAdapter } from '@coherent.js/database';
import { dbConfig } from './config.js';

let db${typeAnnotation};

export async function initDatabase()${returnType} {
  try {
    // Setup database with Coherent.js
    db = setupDatabase({
      adapter: MySQLAdapter(),
      ...dbConfig
    });

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
import { setupDatabase, SQLiteAdapter } from '@coherent.js/database';
import { dbConfig } from './config.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

let db${typeAnnotation};

export async function initDatabase()${returnType} {
  try {
    // Ensure directory exists
    if (dbConfig.filename) {
      mkdirSync(dirname(dbConfig.filename), { recursive: true });
    }

    // Setup database with Coherent.js
    db = setupDatabase({
      adapter: SQLiteAdapter(),
      ...dbConfig
    });

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
process.on('SIGINT', () => {
  if (db) {
    db.close();
    console.log('Database closed');
  }
  process.exit(0);
});
`,
    mongodb: `
import { setupDatabase, MongoDBAdapter } from '@coherent.js/database';
import { dbConfig } from './config.js';

let db${typeAnnotation};

export async function initDatabase()${returnType} {
  try {
    // Setup database with Coherent.js
    db = setupDatabase({
      adapter: MongoDBAdapter(),
      ...dbConfig
    });

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
  const interfaceDef = isTypeScript ? `
interface UserData {
  email: string;
  name: string;
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

  static async create(userData)${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query(
      'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
      [userData.email, userData.name]
    );
    return result.rows[0];
  }

  static async findById(id)${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByEmail(email)${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async update(id, data)${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query(
      'UPDATE users SET email = $1, name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [data.email, data.name, id]
    );
    return result.rows[0];
  }

  static async delete(id)${typeAnnotation} {
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

  static async create(userData)${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query(
      'INSERT INTO users (email, name) VALUES (?, ?)',
      [userData.email, userData.name]
    );
    return result[0];
  }

  static async findById(id)${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return result[0];
  }

  static async findByEmail(email)${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return result[0];
  }

  static async update(id, data)${typeAnnotation} {
    const db = getDatabase();
    const result = await db.query(
      'UPDATE users SET email = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [data.email, data.name, id]
    );
    return result[0];
  }

  static async delete(id)${typeAnnotation} {
    const db = getDatabase();
    await db.query('DELETE FROM users WHERE id = ?', [id]);
  }
}
`,
    sqlite: `
import { getDatabase } from '../index.js';

${interfaceDef}

export class UserModel {
  static createTable()${typeAnnotation} {
    const db = getDatabase();
    db.exec(\`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    \`);
  }

  static create(data)${typeAnnotation} {
    const db = getDatabase();
    const stmt = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)');
    const result = stmt.run(data.email, data.name);
    return { id: result.lastInsertRowid, ...data };
  }

  static findById(id)${typeAnnotation} {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  static findByEmail(email)${typeAnnotation} {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  static update(id, data)${typeAnnotation} {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE users SET email = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(data.email, data.name, id);
    return this.findById(id);
  }

  static delete(id)${typeAnnotation} {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(id);
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

  static async create(userData)${typeAnnotation} {
    const db = getDatabase();
    const result = await db.collection('users').insertOne(userData);
    return { _id: result.insertedId, ...userData };
  }

  static async findById(id)${typeAnnotation} {
    const db = getDatabase();
    return await db.collection('users').findOne({ _id: id });
  }

  static async findByEmail(email)${typeAnnotation} {
    const db = getDatabase();
    return await db.collection('users').findOne({ email });
  }

  static async update(id, data)${typeAnnotation} {
    const db = getDatabase();
    const result = await db.collection('users').updateOne(
      { _id: id },
      { $set: { ...data, updatedAt: new Date() } }
    );
    return result.modifiedCount > 0 ? this.findById(id) : null;
  }

  static async delete(id)${typeAnnotation} {
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
      'better-sqlite3': '^11.3.0',
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
