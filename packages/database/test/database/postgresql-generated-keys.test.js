/**
 * Regression tests: PostgreSQL only reports generated keys through RETURNING, so model
 * inserts must ask for the primary key there (and only there).
 */

import { describe, it, expect, vi } from 'vitest';
import { Model, createModel } from '../../src/model.js';

function database(type, generatedId = 42) {
  return {
    config: { type },
    query: vi.fn(async (sql) => (sql.startsWith('INSERT')
      ? { rows: sql.includes('RETURNING') ? [{ uuid: generatedId, id: generatedId }] : [], insertId: null }
      : { rows: [{ id: generatedId, name: 'a' }] }))
  };
}

describe('generated keys on PostgreSQL', () => {
  it('Model#save() asks for the primary key and stores it', async () => {
    class Item extends Model {
      static tableName = 'items';
      static primaryKey = 'uuid';
      static timestamps = false;
    }
    Item.setDatabase(database('postgresql'));

    const item = await Item.create({ name: 'a' });

    expect(Item.db.query).toHaveBeenCalledWith('INSERT INTO items (name) VALUES (?) RETURNING uuid', ['a']);
    expect(item.get('uuid')).toBe(42);
  });

  it('Model#save() inside a transaction still asks for the primary key', async () => {
    class Item extends Model {
      static tableName = 'items';
      static timestamps = false;
    }
    Item.setDatabase(database('postgresql'));
    const transaction = { query: vi.fn(async () => ({ rows: [{ id: 9 }], insertId: 9 })) };

    const item = await Item.create({ name: 'a' }, { transaction });

    expect(transaction.query).toHaveBeenCalledWith('INSERT INTO items (name) VALUES (?) RETURNING id', ['a']);
    expect(Item.db.query).not.toHaveBeenCalled();
    expect(item.get('id')).toBe(9);
  });

  it('createModel inserts ask for the primary key', async () => {
    const db = database('postgresql', 5);
    const Item = createModel(db).registerModel('Item', { tableName: 'items', attributes: { name: {} } });

    const item = await Item.create({ name: 'a' });

    expect(db.query).toHaveBeenNthCalledWith(1, 'INSERT INTO items (name) VALUES (?) RETURNING id', ['a']);
    expect(item.id).toBe(5);
  });

  it('other databases do not get a RETURNING clause', async () => {
    class Item extends Model {
      static tableName = 'items';
      static timestamps = false;
    }
    Item.setDatabase(database('mysql'));

    await Item.create({ name: 'a' });

    expect(Item.db.query).toHaveBeenCalledWith('INSERT INTO items (name) VALUES (?)', ['a']);
  });
});
