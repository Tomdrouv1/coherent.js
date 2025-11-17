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
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0
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
export function generateDatabaseInit(dbType) {
  const inits = {
    postgres: `
import { setupDatabase } from '@coherent.js/database';
import { dbConfig } from './config.js';

let db;

export async function initDatabase() {
  try {
    // Setup database with Coherent.js
    db = setupDatabase({
      type: 'postgres',
      ...dbConfig
    });

    console.log('✓ Connected to PostgreSQL database');

    return db;
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

export function getDatabase() {
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

let db;

export async function initDatabase() {
  try {
    // Setup database with Coherent.js
    db = setupDatabase({
      type: 'mysql',
      ...dbConfig
    });

    console.log('✓ Connected to MySQL database');

    return db;
  } catch (error) {
    console.error('Failed to connect to MySQL:', error);
    throw error;
  }
}

export function getDatabase() {
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
import { mkdirSync } from 'fs';
import { dirname } from 'path';

let db;

export async function initDatabase() {
  try {
    // Ensure directory exists
    if (dbConfig.filename) {
      mkdirSync(dirname(dbConfig.filename), { recursive: true });
    }

    // Setup database with Coherent.js
    db = setupDatabase({
      type: 'sqlite',
      ...dbConfig
    });

    console.log('✓ Connected to SQLite database');

    return db;
  } catch (error) {
    console.error('Failed to initialize SQLite:', error);
    throw error;
  }
}

export function getDatabase() {
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
import { setupDatabase } from '@coherent.js/database';
import { dbConfig } from './config.js';

let db;

export async function initDatabase() {
  try {
    // Setup database with Coherent.js
    db = setupDatabase({
      type: 'mongodb',
      ...dbConfig
    });

    console.log('✓ Connected to MongoDB database');

    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export function getDatabase() {
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
export function generateExampleModel(dbType) {
  const models = {
    postgres: `
import { getDatabase } from '../index.js';

export class UserModel {
  static async createTable() {
    const db = getDatabase();
    await db.query(\`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    \`);
  }

  static async create(data) {
    const db = getDatabase();
    const result = await db.query(
      'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
      [data.email, data.name]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async update(id, data) {
    const db = getDatabase();
    const result = await db.query(
      'UPDATE users SET email = $1, name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [data.email, data.name, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const db = getDatabase();
    await db.query('DELETE FROM users WHERE id = $1', [id]);
  }
}
`,
    mysql: `
import { getDatabase } from '../index.js';

export class UserModel {
  static async createTable() {
    const db = getDatabase();
    await db.execute(\`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    \`);
  }

  static async create(data) {
    const db = getDatabase();
    const [result] = await db.execute(
      'INSERT INTO users (email, name) VALUES (?, ?)',
      [data.email, data.name]
    );
    return { id: result.insertId, ...data };
  }

  static async findById(id) {
    const db = getDatabase();
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  }

  static async findByEmail(email) {
    const db = getDatabase();
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  static async update(id, data) {
    const db = getDatabase();
    await db.execute(
      'UPDATE users SET email = ?, name = ? WHERE id = ?',
      [data.email, data.name, id]
    );
    return { id, ...data };
  }

  static async delete(id) {
    const db = getDatabase();
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
  }
}
`,
    sqlite: `
import { getDatabase } from '../index.js';

export class UserModel {
  static createTable() {
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

  static create(data) {
    const db = getDatabase();
    const stmt = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)');
    const result = stmt.run(data.email, data.name);
    return { id: result.lastInsertRowid, ...data };
  }

  static findById(id) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  static findByEmail(email) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  static update(id, data) {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE users SET email = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(data.email, data.name, id);
    return { id, ...data };
  }

  static delete(id) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(id);
  }
}
`,
    mongodb: `
import { getDatabase } from '../index.js';

export class UserModel {
  static collectionName = 'users';

  static getCollection() {
    const db = getDatabase();
    return db.collection(this.collectionName);
  }

  static async create(data) {
    const collection = this.getCollection();
    const result = await collection.insertOne({
      email: data.email,
      name: data.name,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { _id: result.insertedId, ...data };
  }

  static async findById(id) {
    const collection = this.getCollection();
    return await collection.findOne({ _id: id });
  }

  static async findByEmail(email) {
    const collection = this.getCollection();
    return await collection.findOne({ email });
  }

  static async update(id, data) {
    const collection = this.getCollection();
    await collection.updateOne(
      { _id: id },
      {
        $set: {
          email: data.email,
          name: data.name,
          updatedAt: new Date()
        }
      }
    );
    return { _id: id, ...data };
  }

  static async delete(id) {
    const collection = this.getCollection();
    await collection.deleteOne({ _id: id });
  }

  static async createIndexes() {
    const collection = this.getCollection();
    await collection.createIndex({ email: 1 }, { unique: true });
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
export function generateDatabaseScaffolding(dbType) {
  return {
    config: generateDatabaseConfig(dbType),
    init: generateDatabaseInit(dbType),
    model: generateExampleModel(dbType),
    env: generateEnvExample(dbType),
    dependencies: getDatabaseDependencies(dbType)
  };
}
