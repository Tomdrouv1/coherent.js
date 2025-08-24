/**
 * Database Migration System for Coherent.js
 * 
 * @fileoverview Provides database schema migration functionality with version control,
 * rollback support, and automatic migration tracking.
 */

import { readdir, writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Create migration instance
 * 
 * @param {DatabaseManager} db - Database manager instance
 * @param {Object} [config={}] - Migration configuration
 * @returns {Object} Migration instance
 * 
 * @example
 * const migration = createMigration(db, {
 *   directory: './migrations',
 *   tableName: 'coherent_migrations'
 * });
 * 
 * await migration.run();
 */
export function createMigration(db, config = {}) {
  const migrationConfig = {
    directory: './migrations',
    tableName: 'coherent_migrations',
    ...config
  };
  
  const migrations = [];
  const appliedMigrations = new Set();

  // Helper functions
  async function ensureMigrationsTable() {
    const tableName = migrationConfig.tableName;
    
    try {
      await db.query(`SELECT 1 FROM ${tableName} LIMIT 1`);
    } catch {
      const createTableSQL = `
        CREATE TABLE ${tableName} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          migration VARCHAR(255) NOT NULL UNIQUE,
          batch INTEGER NOT NULL,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await db.query(createTableSQL);
    }
  }

  async function loadAppliedMigrations() {
    const tableName = migrationConfig.tableName;
    const result = await db.query(`SELECT migration FROM ${tableName} ORDER BY executed_at`);
    
    if (result.rows) {
      result.rows.forEach(row => {
        appliedMigrations.add(row.migration);
      });
    }
  }

  async function loadMigrationFiles() {
    try {
      const files = await readdir(migrationConfig.directory);
      const migrationFiles = files
        .filter(file => file.endsWith('.js'))
        .sort();

      for (const file of migrationFiles) {
        const migrationName = file.replace('.js', '');
        const filePath = join(migrationConfig.directory, file);
        
        try {
          const migration = await import(filePath);
          migrations.push({
            name: migrationName,
            file: filePath,
            up: migration.up,
            down: migration.down,
            applied: appliedMigrations.has(migrationName)
          });
        } catch (error) {
          console.warn(`Failed to load migration ${file}: ${error.message}`);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async function getNextBatchNumber() {
    const result = await db.query(
      `SELECT MAX(batch) as max_batch FROM ${migrationConfig.tableName}`
    );
    
    const maxBatch = result.rows && result.rows[0] ? result.rows[0].max_batch : 0;
    return (maxBatch || 0) + 1;
  }

  async function getLastBatches(count) {
    const result = await db.query(
      `SELECT DISTINCT batch FROM ${migrationConfig.tableName} ORDER BY batch DESC LIMIT ?`,
      [count]
    );
    
    return result.rows ? result.rows.map(row => row.batch) : [];
  }

  async function getMigrationsInBatch(batch) {
    const result = await db.query(
      `SELECT migration FROM ${migrationConfig.tableName} WHERE batch = ? ORDER BY executed_at`,
      [batch]
    );
    
    return result.rows ? result.rows.map(row => row.migration) : [];
  }

  async function ensureDirectory(dirPath) {
    try {
      const { mkdir } = await import('fs/promises');
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  function getMigrationTemplate(name, options) {
    const tableName = options.table || name.replace(/^create_/, '').replace(/_table$/, '');
    
    if (name.startsWith('create_')) {
      return `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

export async function up(schema) {
  await schema.createTable('${tableName}', (table) => {
    table.id();
    table.string('name').notNull();
    table.timestamps();
  });
}

export async function down(schema) {
  await schema.dropTable('${tableName}');
}
`;
    }
    
    return `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

export async function up(schema) {
  // Add your migration logic here
}

export async function down(schema) {
  // Add your rollback logic here
}
`;
  }

  return {
    /**
     * Initialize migration system
     */
    async initialize() {
      await ensureMigrationsTable();
      await loadAppliedMigrations();
      await loadMigrationFiles();
    },

    /**
     * Run pending migrations
     */
    async run(options = {}) {
      await this.initialize();
      
      const pendingMigrations = migrations.filter(m => !m.applied);
      
      if (pendingMigrations.length === 0) {
        return [];
      }

      const batch = await getNextBatchNumber();
      const appliedMigrationsList = [];

      for (const migration of pendingMigrations) {
        try {
          console.log(`Running migration: ${migration.name}`);
          
          const tx = await db.transaction();
          
          try {
            await migration.up(createSchemaBuilder(tx));
            
            await tx.query(
              `INSERT INTO ${migrationConfig.tableName} (migration, batch) VALUES (?, ?)`,
              [migration.name, batch]
            );
            
            await tx.commit();
            
            appliedMigrationsList.push(migration.name);
            migration.applied = true;
            
            console.log(`✓ Migration ${migration.name} completed`);
            
          } catch (error) {
            await tx.rollback();
            throw error;
          }
          
        } catch (error) {
          console.error(`✗ Migration ${migration.name} failed: ${error.message}`);
          
          if (!options.continueOnError) {
            throw error;
          }
        }
      }

      return appliedMigrationsList;
    },

    /**
     * Rollback migrations
     */
    async rollback(steps = 1) {
      await this.initialize();
      
      const batches = await getLastBatches(steps);
      if (batches.length === 0) {
        return [];
      }

      const rolledBackMigrations = [];

      for (const batch of batches) {
        const batchMigrations = await getMigrationsInBatch(batch);
        
        for (const migrationName of batchMigrations.reverse()) {
          const migration = migrations.find(m => m.name === migrationName);
          
          if (!migration || !migration.down) {
            console.warn(`Cannot rollback migration: ${migrationName}`);
            continue;
          }

          try {
            console.log(`Rolling back migration: ${migrationName}`);
            
            const tx = await db.transaction();
            
            try {
              await migration.down(createSchemaBuilder(tx));
              
              await tx.query(
                `DELETE FROM ${migrationConfig.tableName} WHERE migration = ?`,
                [migrationName]
              );
              
              await tx.commit();
              
              rolledBackMigrations.push(migrationName);
              migration.applied = false;
              
              console.log(`✓ Migration ${migrationName} rolled back`);
              
            } catch (error) {
              await tx.rollback();
              throw error;
            }
            
          } catch (error) {
            console.error(`✗ Rollback ${migrationName} failed: ${error.message}`);
            throw error;
          }
        }
      }

      return rolledBackMigrations;
    },

    /**
     * Get migration status
     */
    async status() {
      await this.initialize();
      
      return migrations.map(migration => ({
        name: migration.name,
        applied: migration.applied,
        file: migration.file
      }));
    },

    /**
     * Create new migration file
     */
    async create(name, options = {}) {
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
      const fileName = `${timestamp}_${name}.js`;
      const filePath = join(migrationConfig.directory, fileName);
      
      const template = getMigrationTemplate(name, options);
      
      await ensureDirectory(migrationConfig.directory);
      await writeFile(filePath, template);
      
      console.log(`Created migration: ${filePath}`);
      return filePath;
    }
  };
}

/**
 * Create schema builder instance
 */
export function createSchemaBuilder(db) {
  return {
    async createTable(tableName, callback) {
      const table = createTableBuilder(tableName);
      callback(table);
      
      const sql = table.toCreateSQL();
      await db.query(sql);
    },

    async alterTable(tableName, callback) {
      const table = createTableBuilder(tableName);
      callback(table);
      
      const statements = table.toAlterSQL();
      for (const sql of statements) {
        await db.query(sql);
      }
    },

    async dropTable(tableName) {
      await db.query(`DROP TABLE IF EXISTS ${tableName}`);
    },

    async raw(sql, params = []) {
      return await db.query(sql, params);
    }
  };
}

/**
 * Create table builder instance
 */
export function createTableBuilder(tableName) {
  const columns = [];
  const alterations = [];

  function createColumnBuilder(column) {
    return {
      notNull() {
        column.nullable = false;
        return this;
      },
      unique() {
        column.unique = true;
        return this;
      },
      default(value) {
        column.default = typeof value === 'string' ? `'${value}'` : value;
        return this;
      }
    };
  }

  return {
    id(name = 'id') {
      columns.push({
        name,
        type: 'INTEGER',
        primaryKey: true,
        autoIncrement: true
      });
      return this;
    },

    string(name, length = 255) {
      const column = {
        name,
        type: `VARCHAR(${length})`,
        nullable: true
      };
      
      columns.push(column);
      return createColumnBuilder(column);
    },

    text(name) {
      const column = {
        name,
        type: 'TEXT',
        nullable: true
      };
      
      columns.push(column);
      return createColumnBuilder(column);
    },

    integer(name) {
      const column = {
        name,
        type: 'INTEGER',
        nullable: true
      };
      
      columns.push(column);
      return createColumnBuilder(column);
    },

    boolean(name) {
      const column = {
        name,
        type: 'BOOLEAN',
        nullable: true,
        default: false
      };
      
      columns.push(column);
      return createColumnBuilder(column);
    },

    datetime(name) {
      const column = {
        name,
        type: 'DATETIME',
        nullable: true
      };
      
      columns.push(column);
      return createColumnBuilder(column);
    },

    timestamps() {
      this.datetime('created_at').default('CURRENT_TIMESTAMP');
      this.datetime('updated_at').default('CURRENT_TIMESTAMP');
      return this;
    },

    addColumn(name, type) {
      alterations.push({
        type: 'ADD',
        name,
        columnType: type
      });
      return this;
    },

    dropColumn(name) {
      alterations.push({
        type: 'DROP',
        name
      });
      return this;
    },

    toCreateSQL() {
      const columnDefs = columns.map(col => {
        let def = `${col.name} ${col.type}`;
        
        if (col.primaryKey) {
          def += ' PRIMARY KEY';
        }
        
        if (col.autoIncrement) {
          def += ' AUTOINCREMENT';
        }
        
        if (!col.nullable) {
          def += ' NOT NULL';
        }
        
        if (col.unique) {
          def += ' UNIQUE';
        }
        
        if (col.default !== undefined) {
          def += ` DEFAULT ${col.default}`;
        }
        
        return def;
      });

      return `CREATE TABLE ${tableName} (\n  ${columnDefs.join(',\n  ')}\n)`;
    },

    toAlterSQL() {
      return alterations.map(alt => {
        switch (alt.type) {
          case 'ADD':
            return `ALTER TABLE ${tableName} ADD COLUMN ${alt.name} ${alt.columnType}`;
          case 'DROP':
            return `ALTER TABLE ${tableName} DROP COLUMN ${alt.name}`;
          default:
            throw new Error(`Unsupported alteration type: ${alt.type}`);
        }
      });
    }
  };
}
